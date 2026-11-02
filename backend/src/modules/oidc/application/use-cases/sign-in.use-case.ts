import { Injectable } from '@nestjs/common';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { SessionManager } from '../../../sessions/application/services/session-manager.js';
import {
  PasswordAuthenticator,
  PasswordCredentials,
} from '../../../users/application/services/password-authenticator.js';
import { AuthorizationCompleter } from '../services/authorization-completer.js';
import {
  AuthorizationParams,
  AuthorizationRequestValidator,
} from '../services/authorization-request-validator.js';

export interface SignInInput {
  realmName: string;
  params: AuthorizationParams;
  credentials: PasswordCredentials;
}

export type SignInOutcome =
  | { kind: 'rejected'; reason: string }
  | { kind: 'redirect'; location: string }
  | { kind: 'failed'; realm: Realm }
  | {
      kind: 'signed_in';
      location: string;
      realm: Realm;
      sessionToken: string;
    };

@Injectable()
export class SignInUseCase {
  constructor(
    private readonly validator: AuthorizationRequestValidator,
    private readonly passwordAuthenticator: PasswordAuthenticator,
    private readonly sessions: SessionManager,
    private readonly completer: AuthorizationCompleter,
  ) {}

  async execute({
    realmName,
    params,
    credentials,
  }: SignInInput): Promise<SignInOutcome> {
    const outcome = await this.validator.validate(realmName, params);
    if (outcome.kind === 'rejected') {
      return outcome;
    }
    if (outcome.kind === 'redirect_error') {
      return {
        kind: 'redirect',
        location: this.completer.errorRedirect(outcome, realmName),
      };
    }

    const { request } = outcome;
    const user = await this.passwordAuthenticator.authenticate(
      request.realm,
      credentials,
    );
    if (!user) {
      return { kind: 'failed', realm: request.realm };
    }

    const { session, token } = await this.sessions.start(request.realm, user);
    return {
      kind: 'signed_in',
      location: await this.completer.complete(request, session),
      realm: request.realm,
      sessionToken: token,
    };
  }
}
