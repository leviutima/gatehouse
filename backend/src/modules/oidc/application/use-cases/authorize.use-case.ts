import { Injectable } from '@nestjs/common';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { SessionManager } from '../../../sessions/application/services/session-manager.js';
import { AuthorizationCompleter } from '../services/authorization-completer.js';
import {
  AuthorizationParams,
  AuthorizationRequestValidator,
} from '../services/authorization-request-validator.js';

export interface AuthorizeInput {
  realmName: string;
  params: AuthorizationParams;
  sessionToken: string | undefined;
}

export type AuthorizeOutcome =
  | { kind: 'rejected'; reason: string }
  | { kind: 'redirect'; location: string }
  | { kind: 'login_required'; realm: Realm };

@Injectable()
export class AuthorizeUseCase {
  constructor(
    private readonly validator: AuthorizationRequestValidator,
    private readonly sessions: SessionManager,
    private readonly completer: AuthorizationCompleter,
  ) {}

  async execute({
    realmName,
    params,
    sessionToken,
  }: AuthorizeInput): Promise<AuthorizeOutcome> {
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
    const resumed = await this.sessions.resume(request.realm, sessionToken);
    if (!resumed) {
      return { kind: 'login_required', realm: request.realm };
    }
    return {
      kind: 'redirect',
      location: await this.completer.complete(request, resumed.session),
    };
  }
}
