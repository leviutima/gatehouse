import { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { SigningKey } from '../../domain/entities/signing-key.entity.js';
import { SigningKeyRepository } from '../../domain/repositories/signing-key.repository.js';
import { SigningKeyStatus } from '../../domain/signing-key-status.js';
import { GetRealmJwksUseCase } from './get-realm-jwks.use-case.js';

const now = new Date('2026-10-27T00:00:00Z');

class InMemoryRealmRepository extends RealmRepository {
  private readonly shop = new Realm({
    id: 'shop-id',
    name: 'shop',
    displayName: 'Shop',
    enabled: true,
    loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
    passwordMinLength: 12,
    createdAt: now,
    updatedAt: now,
  });

  findByName(name: string): Promise<Realm | null> {
    return Promise.resolve(name === this.shop.name ? this.shop : null);
  }

  create(): Promise<Realm> {
    return Promise.reject(new Error('not used'));
  }
}

function signingKey(id: string, status: SigningKeyStatus): SigningKey {
  return new SigningKey({
    id,
    realmId: 'shop-id',
    algorithm: 'ES256',
    status,
    publicJwk: { kty: 'EC', crv: 'P-256', x: `${id}-x`, y: `${id}-y` },
    encryptedPrivateKey: 'v1.iv.tag.ciphertext',
    createdAt: now,
    updatedAt: now,
  });
}

class InMemorySigningKeyRepository extends SigningKeyRepository {
  readonly keys = [
    signingKey('key-2', SigningKeyStatus.ACTIVE),
    signingKey('key-1', SigningKeyStatus.PASSIVE),
  ];

  findActive(): Promise<SigningKey | null> {
    return Promise.reject(new Error('not used'));
  }

  findPublished(realmId: string): Promise<SigningKey[]> {
    return Promise.resolve(this.keys.filter((key) => key.realmId === realmId));
  }

  create(): Promise<SigningKey> {
    return Promise.reject(new Error('not used'));
  }
}

describe('GetRealmJwksUseCase', () => {
  const useCase = new GetRealmJwksUseCase(
    new InMemoryRealmRepository(),
    new InMemorySigningKeyRepository(),
  );

  it('returns the published keys of the realm as JWKs', async () => {
    await expect(useCase.execute('shop')).resolves.toEqual([
      {
        kty: 'EC',
        crv: 'P-256',
        x: 'key-2-x',
        y: 'key-2-y',
        kid: 'key-2',
        alg: 'ES256',
        use: 'sig',
      },
      {
        kty: 'EC',
        crv: 'P-256',
        x: 'key-1-x',
        y: 'key-1-y',
        kid: 'key-1',
        alg: 'ES256',
        use: 'sig',
      },
    ]);
  });

  it('fails for an unknown realm', async () => {
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      RealmNotFoundError,
    );
  });
});
