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
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.js';
import { OAuthError } from '../errors/oauth.error.js';
import {
  IssuedUserTokens,
  UserTokenIssuer,
} from '../services/user-token-issuer.js';

export interface RefreshTokensInput {
  realmName: string;
  credentials: ClientCredentials;
  refreshToken: string | undefined;
  scope: string | undefined;
}

const INVALID_REFRESH_TOKEN =
  'The refresh token is invalid, expired or was already used';

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly clientAuthenticator: ClientAuthenticator,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly secretHasher: SecretHasher,
    private readonly sessions: SessionManager,
    private readonly userTokenIssuer: UserTokenIssuer,
    private readonly clock: Clock,
  ) {}

  async execute({
    realmName,
    credentials,
    refreshToken,
    scope,
  }: RefreshTokensInput): Promise<IssuedUserTokens> {
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
    if (!client.allowsGrant(GrantType.REFRESH_TOKEN)) {
      throw OAuthError.unauthorizedClient('refresh_token');
    }
    if (!refreshToken) {
      throw OAuthError.invalidRequest('refresh_token is required');
    }

    const stored = await this.refreshTokens.findByTokenHash(
      this.secretHasher.hash(refreshToken),
    );
    if (
      !stored ||
      stored.realmId !== realm.id ||
      stored.clientId !== client.id
    ) {
      throw OAuthError.invalidGrant(INVALID_REFRESH_TOKEN);
    }

    const now = this.clock.now();
    if (stored.isUsed || !(await this.refreshTokens.markUsed(stored.id, now))) {
      await this.refreshTokens.revokeFamily(stored.familyId);
      await this.sessions.end(stored.sessionId);
      throw OAuthError.invalidGrant(INVALID_REFRESH_TOKEN);
    }
    if (stored.isExpiredAt(now)) {
      throw OAuthError.invalidGrant(INVALID_REFRESH_TOKEN);
    }

    const granted = stored.scope.split(' ').filter(Boolean);
    const requested = scope?.split(' ').filter(Boolean);
    if (requested?.some((value) => !granted.includes(value))) {
      throw OAuthError.invalidScope();
    }

    const resumed = await this.sessions.resumeById(realm, stored.sessionId);
    if (!resumed) {
      throw OAuthError.invalidGrant(INVALID_REFRESH_TOKEN);
    }

    return this.userTokenIssuer.issue({
      realm,
      client,
      user: resumed.user,
      session: resumed.session,
      scope: requested ? requested.join(' ') : stored.scope,
      nonce: null,
      refreshScope: stored.scope,
      refreshFamilyId: stored.familyId,
    });
  }
}
