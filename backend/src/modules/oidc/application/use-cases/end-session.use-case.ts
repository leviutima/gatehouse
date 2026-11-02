import { Injectable } from '@nestjs/common';
import type { Client } from '../../../clients/domain/entities/client.entity.js';
import { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { SessionManager } from '../../../sessions/application/services/session-manager.js';
import { authorizationRedirect } from '../authorization-redirect.js';
import {
  IdTokenHint,
  IdTokenHintReader,
} from '../services/id-token-hint-reader.js';

export interface EndSessionInput {
  realmName: string;
  params: Record<string, unknown>;
  sessionToken: string | undefined;
  confirmed: boolean;
}

export type EndSessionOutcome =
  | { kind: 'rejected'; reason: string }
  | { kind: 'confirm'; realm: Realm }
  | { kind: 'signed_out'; realm: Realm; location: string | null };

@Injectable()
export class EndSessionUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly clients: ClientRepository,
    private readonly hintReader: IdTokenHintReader,
    private readonly sessions: SessionManager,
  ) {}

  async execute({
    realmName,
    params,
    sessionToken,
    confirmed,
  }: EndSessionInput): Promise<EndSessionOutcome> {
    const realm = await this.realms.findByName(realmName);
    if (!realm?.enabled) {
      return rejected('This realm does not exist.');
    }
    if (Object.values(params).some((value) => Array.isArray(value))) {
      return rejected('The sign-out request is not valid.');
    }

    const rawHint = single(params.id_token_hint);
    const hint = rawHint ? await this.hintReader.read(realm, rawHint) : null;
    if (rawHint && !hint) {
      return rejected('The sign-out request is not valid.');
    }

    const requestedClientId = single(params.client_id);
    if (hint && requestedClientId && requestedClientId !== hint.clientId) {
      return rejected('The sign-out request is not valid.');
    }
    const clientId = hint?.clientId ?? requestedClientId;
    const client = clientId
      ? await this.clients.findByClientId(realm.id, clientId)
      : null;
    if (clientId && !client) {
      return rejected('This application is not registered with this realm.');
    }

    const redirectUri = single(params.post_logout_redirect_uri);
    if (redirectUri && !isAllowed(client, redirectUri)) {
      return rejected(
        'The address this application asked to return to is not registered.',
      );
    }

    if (!hint && !confirmed) {
      return { kind: 'confirm', realm };
    }

    await this.endSessions(realm, sessionToken, hint);
    return {
      kind: 'signed_out',
      realm,
      location: redirectUri
        ? authorizationRedirect(redirectUri, {
            state: single(params.state) ?? null,
          })
        : null,
    };
  }

  private async endSessions(
    realm: Realm,
    sessionToken: string | undefined,
    hint: IdTokenHint | null,
  ): Promise<void> {
    const current = await this.sessions.resume(realm, sessionToken);
    if (current) {
      await this.sessions.end(current.session.id);
    }
    if (hint?.sessionId) {
      const hinted = await this.sessions.find(hint.sessionId);
      if (hinted?.realmId === realm.id && hinted.userId === hint.subject) {
        await this.sessions.end(hinted.id);
      }
    }
  }
}

function isAllowed(client: Client | null, redirectUri: string): boolean {
  return client?.isPostLogoutRedirectUriAllowed(redirectUri) ?? false;
}

function single(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function rejected(reason: string): EndSessionOutcome {
  return { kind: 'rejected', reason };
}
