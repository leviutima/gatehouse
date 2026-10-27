import { Injectable } from '@nestjs/common';
import type { Principal } from '../../../shared/application/auth/principal.js';
import { TokenVerifier } from '../../../shared/application/auth/token-verifier.js';
import { Clock } from '../../../shared/application/time/clock.js';
import { RealmRepository } from '../../realms/domain/repositories/realm.repository.js';
import { JwtVerifier } from '../../signing-keys/application/jwt-verifier.js';
import { SigningKeyRepository } from '../../signing-keys/domain/repositories/signing-key.repository.js';
import { RealmIssuer } from '../application/realm-issuer.js';
import { ACCESS_TOKEN_TYPE } from '../application/services/access-token-issuer.js';

@Injectable()
export class RealmAccessTokenVerifier extends TokenVerifier {
  constructor(
    private readonly realmIssuer: RealmIssuer,
    private readonly realmRepository: RealmRepository,
    private readonly signingKeyRepository: SigningKeyRepository,
    private readonly jwtVerifier: JwtVerifier,
    private readonly clock: Clock,
  ) {
    super();
  }

  async verify(token: string): Promise<Principal | null> {
    const unverified = this.jwtVerifier.decode(token);
    const issuer = unverified?.claims.iss;
    if (!unverified?.kid || typeof issuer !== 'string') {
      return null;
    }

    const realmName = this.realmIssuer.realmNameOf(issuer);
    const realm = realmName
      ? await this.realmRepository.findByName(realmName)
      : null;
    if (!realm?.enabled) {
      return null;
    }

    const keys = await this.signingKeyRepository.findPublished(realm.id);
    const key = keys.find(({ kid }) => kid === unverified.kid);
    if (!key) {
      return null;
    }

    const claims = await this.jwtVerifier.verify({
      token,
      publicJwk: key.publicJwk,
      algorithm: key.algorithm,
      typ: ACCESS_TOKEN_TYPE,
      issuer,
      audience: issuer,
      currentDate: this.clock.now(),
    });
    if (
      typeof claims?.sub !== 'string' ||
      typeof claims.client_id !== 'string'
    ) {
      return null;
    }

    return {
      subject: claims.sub,
      realm: realm.name,
      clientId: claims.client_id,
      scopes: [],
    };
  }
}
