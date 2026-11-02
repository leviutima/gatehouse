import { Injectable } from '@nestjs/common';
import type { Session } from '../../../sessions/domain/entities/session.entity.js';
import { authorizationRedirect } from '../authorization-redirect.js';
import { RealmIssuer } from '../realm-issuer.js';
import { AuthorizationCodeIssuer } from './authorization-code-issuer.js';
import type {
  AuthorizationRequestOutcome,
  ValidAuthorizationRequest,
} from './authorization-request-validator.js';

@Injectable()
export class AuthorizationCompleter {
  constructor(
    private readonly codeIssuer: AuthorizationCodeIssuer,
    private readonly realmIssuer: RealmIssuer,
  ) {}

  async complete(
    request: ValidAuthorizationRequest,
    session: Session,
  ): Promise<string> {
    const code = await this.codeIssuer.issue({
      realmId: request.realm.id,
      clientId: request.client.id,
      userId: session.userId,
      sessionId: session.id,
      redirectUri: request.redirectUri,
      scope: request.scope,
      codeChallenge: request.codeChallenge,
      nonce: request.nonce,
    });
    return authorizationRedirect(request.redirectUri, {
      code,
      state: request.state,
      iss: this.realmIssuer.forRealm(request.realm.name),
    });
  }

  errorRedirect(
    outcome: Extract<AuthorizationRequestOutcome, { kind: 'redirect_error' }>,
    realmName: string,
  ): string {
    return authorizationRedirect(outcome.redirectUri, {
      error: outcome.error,
      error_description: outcome.description,
      state: outcome.state,
      iss: this.realmIssuer.forRealm(realmName),
    });
  }
}
