import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { SigningKey } from '../../domain/entities/signing-key.entity.js';
import { SigningKeyStatus } from '../../domain/signing-key-status.js';
import { InMemorySigningKeyRepository } from '../../testing/in-memory-signing-key.repository.js';
import { GetRealmJwksUseCase } from './get-realm-jwks.use-case.js';

const now = new Date('2026-10-27T00:00:00Z');

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

describe('GetRealmJwksUseCase', () => {
  const useCase = new GetRealmJwksUseCase(
    new InMemoryRealmRepository([aRealm()]),
    new InMemorySigningKeyRepository([
      signingKey('key-2', SigningKeyStatus.ACTIVE),
      signingKey('key-1', SigningKeyStatus.PASSIVE),
    ]),
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
