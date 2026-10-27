import { decodeProtectedHeader, importJWK, jwtVerify } from 'jose';
import { KeyEncryptor } from '../../../../shared/application/crypto/key-encryptor.js';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { Clock } from '../../../../shared/application/time/clock.js';
import { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { RealmTokenSigner } from '../../../signing-keys/application/services/realm-token-signer.js';
import { SigningKeyProvisioner } from '../../../signing-keys/application/services/signing-key-provisioner.js';
import { SigningKey } from '../../../signing-keys/domain/entities/signing-key.entity.js';
import {
  CreateSigningKeyData,
  SigningKeyRepository,
} from '../../../signing-keys/domain/repositories/signing-key.repository.js';
import { JoseEs256KeyPairGenerator } from '../../../signing-keys/infrastructure/crypto/jose-es256-key-pair-generator.js';
import { JoseJwtSigner } from '../../../signing-keys/infrastructure/crypto/jose-jwt-signer.js';
import { RealmIssuer } from '../realm-issuer.js';
import { AccessTokenIssuer } from './access-token-issuer.js';

const now = new Date('2026-10-27T12:00:00Z');
const nowSeconds = now.getTime() / 1000;

class InMemorySigningKeyRepository extends SigningKeyRepository {
  readonly keys: SigningKey[] = [];

  findActive(realmId: string): Promise<SigningKey | null> {
    return Promise.resolve(
      this.keys.find((key) => key.realmId === realmId && key.isActive) ?? null,
    );
  }

  findPublished(realmId: string): Promise<SigningKey[]> {
    return Promise.resolve(this.keys.filter((key) => key.realmId === realmId));
  }

  create(data: CreateSigningKeyData): Promise<SigningKey> {
    const key = new SigningKey({
      id: `key-${this.keys.length + 1}`,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.keys.push(key);
    return Promise.resolve(key);
  }
}

class PlainKeyEncryptor extends KeyEncryptor {
  encrypt(plaintext: string): string {
    return plaintext;
  }

  decrypt(payload: string): string {
    return payload;
  }
}

class FixedClock extends Clock {
  now(): Date {
    return now;
  }
}

class FixedSecretGenerator extends SecretGenerator {
  generate(): string {
    return 'token-id';
  }
}

class FakeRealmIssuer extends RealmIssuer {
  forRealm(realmName: string): string {
    return `https://auth.example.com/realms/${realmName}`;
  }
}

describe('AccessTokenIssuer', () => {
  const realm = new Realm({
    id: 'shop-id',
    name: 'shop',
    displayName: 'Shop',
    enabled: true,
    loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
    passwordMinLength: 12,
    accessTokenLifespan: 600,
    createdAt: now,
    updatedAt: now,
  });

  let keys: InMemorySigningKeyRepository;
  let issuer: AccessTokenIssuer;

  beforeEach(() => {
    keys = new InMemorySigningKeyRepository();
    const encryptor = new PlainKeyEncryptor();
    issuer = new AccessTokenIssuer(
      new FakeRealmIssuer(),
      new RealmTokenSigner(
        new SigningKeyProvisioner(
          keys,
          new JoseEs256KeyPairGenerator(),
          encryptor,
        ),
        encryptor,
        new JoseJwtSigner(),
      ),
      new FixedSecretGenerator(),
      new FixedClock(),
    );
  });

  async function verify(token: string) {
    return jwtVerify(
      token,
      await importJWK(keys.keys[0].toPublishedJwk(), 'ES256'),
      { currentDate: now },
    );
  }

  it('issues an ES256 access token signed with the realm active key', async () => {
    const { token } = await issuer.issue({
      realm,
      subject: 'client-uuid',
      clientId: 'billing',
    });

    expect(decodeProtectedHeader(token)).toEqual({
      alg: 'ES256',
      kid: keys.keys[0].kid,
      typ: 'at+jwt',
    });
    await expect(verify(token)).resolves.toBeDefined();
  });

  it('carries the RFC 9068 claims with the realm lifespan', async () => {
    const { token, expiresIn } = await issuer.issue({
      realm,
      subject: 'client-uuid',
      clientId: 'billing',
    });

    const { payload } = await verify(token);
    expect(expiresIn).toBe(600);
    expect(payload).toEqual({
      iss: 'https://auth.example.com/realms/shop',
      sub: 'client-uuid',
      aud: 'https://auth.example.com/realms/shop',
      client_id: 'billing',
      iat: nowSeconds,
      exp: nowSeconds + 600,
      jti: 'token-id',
    });
  });
});
