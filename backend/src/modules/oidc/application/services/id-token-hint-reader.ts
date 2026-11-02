import { Injectable } from '@nestjs/common';
import { Clock } from '../../../../shared/application/time/clock.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { JwtVerifier } from '../../../signing-keys/application/jwt-verifier.js';
import { SigningKeyRepository } from '../../../signing-keys/domain/repositories/signing-key.repository.js';
import { RealmIssuer } from '../realm-issuer.js';
import { ID_TOKEN_TYPE } from './id-token-issuer.js';

export interface IdTokenHint {
  clientId: string;
  subject: string;
  sessionId: string | null;
}

@Injectable()
export class IdTokenHintReader {
  constructor(
    private readonly realmIssuer: RealmIssuer,
    private readonly signingKeys: SigningKeyRepository,
    private readonly jwtVerifier: JwtVerifier,
    private readonly clock: Clock,
  ) {}

  async read(realm: Realm, hint: string): Promise<IdTokenHint | null> {
    const unverified = this.jwtVerifier.decode(hint);
    if (!unverified?.kid) {
      return null;
    }
    const keys = await this.signingKeys.findPublished(realm.id);
    const key = keys.find(({ kid }) => kid === unverified.kid);
    if (!key) {
      return null;
    }

    const claims = await this.jwtVerifier.verify({
      token: hint,
      publicJwk: key.publicJwk,
      algorithm: key.algorithm,
      typ: ID_TOKEN_TYPE,
      issuer: this.realmIssuer.forRealm(realm.name),
      currentDate: this.clock.now(),
      acceptExpired: true,
    });
    if (typeof claims?.aud !== 'string' || typeof claims.sub !== 'string') {
      return null;
    }
    return {
      clientId: claims.aud,
      subject: claims.sub,
      sessionId: typeof claims.sid === 'string' ? claims.sid : null,
    };
  }
}
