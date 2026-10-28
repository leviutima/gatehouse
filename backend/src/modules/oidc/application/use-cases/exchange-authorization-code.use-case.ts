import { Injectable } from '@nestjs/common';
import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import { Clock } from '../../../../shared/application/time/clock.js';
import {
  ClientAuthenticator,
  ClientCredentials,
} from '../../../clients/application/services/client-authenticator.js';
import { GrantType } from '../../../clients/domain/grant-type.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { SessionManager } from '../../../sessions/application/services/session-manager.js';
import { UserRepository } from '../../../users/domain/repositories/user.repository.js';
import { AuthorizationCodeRepository } from '../../domain/repositories/authorization-code.repository.js';
import { OPENID_SCOPE } from '../../domain/scope.js';
import { CodeChallengeVerifier } from '../code-challenge-verifier.js';
import { OAuthError } from '../errors/oauth.error.js';
import { AccessTokenIssuer } from '../services/access-token-issuer.js';
import { IdTokenIssuer } from '../services/id-token-issuer.js';

export interface AuthorizationCodeTokenInput {
  realmName: string;
  credentials: ClientCredentials;
  code: string | undefined;
  redirectUri: string | undefined;
  codeVerifier: string | undefined;
}

export interface IssuedUserTokens {
  accessToken: string;
  idToken: string | null;
  expiresIn: number;
  scope: string;
}

@Injectable()
export class ExchangeAuthorizationCodeUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly clientAuthenticator: ClientAuthenticator,
    private readonly codes: AuthorizationCodeRepository,
    private readonly secretHasher: SecretHasher,
    private readonly codeChallengeVerifier: CodeChallengeVerifier,
    private readonly users: UserRepository,
    private readonly sessions: SessionManager,
    private readonly accessTokenIssuer: AccessTokenIssuer,
    private readonly idTokenIssuer: IdTokenIssuer,
    private readonly clock: Clock,
  ) {}

  async execute({
    realmName,
    credentials,
    code,
    redirectUri,
    codeVerifier,
  }: AuthorizationCodeTokenInput): Promise<IssuedUserTokens> {
    const realm = await this.realms.findByName(realmName);
    if (!realm?.enabled) {
      throw new RealmNotFoundError(realmName);
    }
    const client = await this.clientAuthenticator.authenticate(
      realm.id,
      credentials,
    );
    if (!client) {
      throw OAuthError.invalidClient();
    }
    if (!client.allowsGrant(GrantType.AUTHORIZATION_CODE)) {
      throw OAuthError.unauthorizedClient('authorization_code');
    }
    if (!code || !redirectUri || !codeVerifier) {
      throw OAuthError.invalidRequest(
        'code, redirect_uri and code_verifier are required',
      );
    }

    const stored = await this.codes.findByCodeHash(
      this.secretHasher.hash(code),
    );
    if (
      !stored ||
      stored.realmId !== realm.id ||
      stored.clientId !== client.id
    ) {
      throw OAuthError.invalidGrant();
    }

    const now = this.clock.now();
    if (stored.isConsumed || !(await this.codes.markConsumed(stored.id, now))) {
      await this.sessions.end(stored.sessionId);
      throw OAuthError.invalidGrant();
    }
    if (
      stored.isExpiredAt(now) ||
      stored.redirectUri !== redirectUri ||
      !this.codeChallengeVerifier.matches(codeVerifier, stored.codeChallenge)
    ) {
      throw OAuthError.invalidGrant();
    }

    const user = await this.users.findById(realm.id, stored.userId);
    const session = await this.sessions.find(stored.sessionId);
    if (!user?.enabled || !session) {
      throw OAuthError.invalidGrant();
    }

    const scopes = stored.scope.split(' ').filter(Boolean);
    const { token, expiresIn } = await this.accessTokenIssuer.issue({
      realm,
      subject: user.id,
      clientId: client.clientId,
      scope: stored.scope,
      sessionId: session.id,
    });
    const idToken = scopes.includes(OPENID_SCOPE)
      ? await this.idTokenIssuer.issue({
          realm,
          client,
          user,
          session,
          scopes,
          nonce: stored.nonce,
        })
      : null;

    return { accessToken: token, idToken, expiresIn, scope: stored.scope };
  }
}
