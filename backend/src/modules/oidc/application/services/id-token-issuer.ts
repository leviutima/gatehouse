import { Injectable } from '@nestjs/common';
import { Clock } from '../../../../shared/application/time/clock.js';
import type { Client } from '../../../clients/domain/entities/client.entity.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import type { Session } from '../../../sessions/domain/entities/session.entity.js';
import type { JwtClaims } from '../../../signing-keys/application/jwt-signer.js';
import { RealmTokenSigner } from '../../../signing-keys/application/services/realm-token-signer.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import { RealmIssuer } from '../realm-issuer.js';

export const ID_TOKEN_TYPE = 'JWT';

export interface IdTokenRequest {
  realm: Realm;
  client: Client;
  user: User;
  session: Session;
  scopes: readonly string[];
  nonce: string | null;
}

@Injectable()
export class IdTokenIssuer {
  constructor(
    private readonly realmIssuer: RealmIssuer,
    private readonly tokenSigner: RealmTokenSigner,
    private readonly clock: Clock,
  ) {}

  issue({
    realm,
    client,
    user,
    session,
    scopes,
    nonce,
  }: IdTokenRequest): Promise<string> {
    const issuedAt = Math.floor(this.clock.now().getTime() / 1000);
    const claims: JwtClaims = {
      iss: this.realmIssuer.forRealm(realm.name),
      sub: user.id,
      aud: client.clientId,
      azp: client.clientId,
      iat: issuedAt,
      exp: issuedAt + realm.accessTokenLifespan,
      auth_time: Math.floor(session.authTime.getTime() / 1000),
      sid: session.id,
      ...(nonce === null ? {} : { nonce }),
      ...(scopes.includes('profile')
        ? { preferred_username: user.username }
        : {}),
      ...(scopes.includes('email')
        ? { email: user.email, email_verified: user.emailVerified }
        : {}),
    };
    return this.tokenSigner.sign(realm.id, ID_TOKEN_TYPE, claims);
  }
}
