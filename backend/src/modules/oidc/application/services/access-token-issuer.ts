import { Injectable } from '@nestjs/common';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { Clock } from '../../../../shared/application/time/clock.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmTokenSigner } from '../../../signing-keys/application/services/realm-token-signer.js';
import { RealmIssuer } from '../realm-issuer.js';

export const ACCESS_TOKEN_TYPE = 'at+jwt';

export interface AccessTokenRoles {
  realm: string[];
  client: string[];
}

export interface AccessTokenRequest {
  realm: Realm;
  subject: string;
  clientId: string;
  scope?: string;
  sessionId?: string;
  roles?: AccessTokenRoles;
}

export interface IssuedAccessToken {
  token: string;
  expiresIn: number;
}

@Injectable()
export class AccessTokenIssuer {
  constructor(
    private readonly realmIssuer: RealmIssuer,
    private readonly tokenSigner: RealmTokenSigner,
    private readonly secretGenerator: SecretGenerator,
    private readonly clock: Clock,
  ) {}

  async issue({
    realm,
    subject,
    clientId,
    scope,
    sessionId,
    roles,
  }: AccessTokenRequest): Promise<IssuedAccessToken> {
    const issuer = this.realmIssuer.forRealm(realm.name);
    const issuedAt = Math.floor(this.clock.now().getTime() / 1000);
    const expiresIn = realm.accessTokenLifespan;

    const token = await this.tokenSigner.sign(realm.id, ACCESS_TOKEN_TYPE, {
      iss: issuer,
      sub: subject,
      aud: issuer,
      client_id: clientId,
      iat: issuedAt,
      exp: issuedAt + expiresIn,
      jti: this.secretGenerator.generate(),
      ...(scope === undefined ? {} : { scope }),
      ...(sessionId === undefined ? {} : { sid: sessionId }),
      ...roleClaims(clientId, roles),
    });

    return { token, expiresIn };
  }
}

function roleClaims(
  clientId: string,
  roles: AccessTokenRoles | undefined,
): Record<string, unknown> {
  return {
    ...(roles?.realm.length ? { realm_access: { roles: roles.realm } } : {}),
    ...(roles?.client.length
      ? { resource_access: { [clientId]: { roles: roles.client } } }
      : {}),
  };
}
