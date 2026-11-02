import { Injectable } from '@nestjs/common';
import type { Client } from '../../../clients/domain/entities/client.entity.js';
import { GrantType } from '../../../clients/domain/grant-type.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import type { Session } from '../../../sessions/domain/entities/session.entity.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import { OPENID_SCOPE } from '../../domain/scope.js';
import { AccessTokenIssuer } from './access-token-issuer.js';
import { IdTokenIssuer } from './id-token-issuer.js';
import { RefreshTokenIssuer } from './refresh-token-issuer.js';

export interface UserTokenGrant {
  realm: Realm;
  client: Client;
  user: User;
  session: Session;
  scope: string;
  nonce: string | null;
  refreshScope?: string;
  refreshFamilyId?: string;
}

export interface IssuedUserTokens {
  accessToken: string;
  idToken: string | null;
  refreshToken: string | null;
  expiresIn: number;
  scope: string;
}

@Injectable()
export class UserTokenIssuer {
  constructor(
    private readonly accessTokenIssuer: AccessTokenIssuer,
    private readonly idTokenIssuer: IdTokenIssuer,
    private readonly refreshTokenIssuer: RefreshTokenIssuer,
  ) {}

  async issue({
    realm,
    client,
    user,
    session,
    scope,
    nonce,
    refreshScope = scope,
    refreshFamilyId,
  }: UserTokenGrant): Promise<IssuedUserTokens> {
    const scopes = scope.split(' ').filter(Boolean);
    const { token, expiresIn } = await this.accessTokenIssuer.issue({
      realm,
      subject: user.id,
      clientId: client.clientId,
      scope,
      sessionId: session.id,
    });
    const idToken = scopes.includes(OPENID_SCOPE)
      ? await this.idTokenIssuer.issue({
          realm,
          client,
          user,
          session,
          scopes,
          nonce,
        })
      : null;
    const refreshToken = client.allowsGrant(GrantType.REFRESH_TOKEN)
      ? await this.refreshTokenIssuer.issue({
          clientId: client.id,
          session,
          scope: refreshScope,
          familyId: refreshFamilyId,
        })
      : null;

    return { accessToken: token, idToken, refreshToken, expiresIn, scope };
  }
}
