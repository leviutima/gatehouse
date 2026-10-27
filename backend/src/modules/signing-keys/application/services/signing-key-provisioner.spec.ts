import { KeyEncryptor } from '../../../../shared/application/crypto/key-encryptor.js';
import { SigningKey } from '../../domain/entities/signing-key.entity.js';
import { ActiveSigningKeyAlreadyExistsError } from '../../domain/errors/active-signing-key-already-exists.error.js';
import {
  CreateSigningKeyData,
  SigningKeyRepository,
} from '../../domain/repositories/signing-key.repository.js';
import { SigningKeyStatus } from '../../domain/signing-key-status.js';
import { GeneratedKeyPair, KeyPairGenerator } from '../key-pair-generator.js';
import { SigningKeyProvisioner } from './signing-key-provisioner.js';

const now = new Date('2026-10-27T00:00:00Z');

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

class FakeKeyPairGenerator extends KeyPairGenerator {
  readonly algorithm = 'ES256';
  readonly generate = vi.fn((): Promise<GeneratedKeyPair> =>
    Promise.resolve({
      publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
      privateKeyPkcs8: 'private-pem',
    }),
  );
}

class FakeKeyEncryptor extends KeyEncryptor {
  encrypt(plaintext: string): string {
    return `encrypted:${plaintext}`;
  }

  decrypt(payload: string): string {
    return payload.replace('encrypted:', '');
  }
}

describe('SigningKeyProvisioner', () => {
  let keys: InMemorySigningKeyRepository;
  let generator: FakeKeyPairGenerator;
  let provisioner: SigningKeyProvisioner;

  beforeEach(() => {
    keys = new InMemorySigningKeyRepository();
    generator = new FakeKeyPairGenerator();
    provisioner = new SigningKeyProvisioner(
      keys,
      generator,
      new FakeKeyEncryptor(),
    );
  });

  it('creates an active key with the private key encrypted', async () => {
    const key = await provisioner.ensureActive('realm-1');

    expect(key).toMatchObject({
      realmId: 'realm-1',
      algorithm: 'ES256',
      status: SigningKeyStatus.ACTIVE,
      publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
      encryptedPrivateKey: 'encrypted:private-pem',
    });
  });

  it('returns the existing active key without generating a new one', async () => {
    const first = await provisioner.ensureActive('realm-1');
    const second = await provisioner.ensureActive('realm-1');

    expect(second.id).toBe(first.id);
    expect(generator.generate).toHaveBeenCalledTimes(1);
    expect(keys.keys).toHaveLength(1);
  });

  it('keeps keys of different realms apart', async () => {
    const first = await provisioner.ensureActive('realm-1');
    const second = await provisioner.ensureActive('realm-2');

    expect(second.id).not.toBe(first.id);
    expect(second.realmId).toBe('realm-2');
  });

  it('returns the key of a concurrent caller that won the race', async () => {
    const create = keys.create.bind(keys);
    let winner: SigningKey | undefined;
    vi.spyOn(keys, 'create').mockImplementationOnce(async (data) => {
      winner = await create(data);
      throw new ActiveSigningKeyAlreadyExistsError();
    });

    const key = await provisioner.ensureActive('realm-1');

    expect(key.id).toBe(winner?.id);
    expect(keys.keys).toHaveLength(1);
  });

  it('propagates a conflict when no active key can be found afterwards', async () => {
    vi.spyOn(keys, 'create').mockRejectedValueOnce(
      new ActiveSigningKeyAlreadyExistsError(),
    );

    await expect(provisioner.ensureActive('realm-1')).rejects.toBeInstanceOf(
      ActiveSigningKeyAlreadyExistsError,
    );
  });
});
