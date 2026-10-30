import { FakeKeyEncryptor } from '../../../../shared/testing/fake-key-encryptor.js';
import type { SigningKey } from '../../domain/entities/signing-key.entity.js';
import { ActiveSigningKeyAlreadyExistsError } from '../../domain/errors/active-signing-key-already-exists.error.js';
import { SigningKeyStatus } from '../../domain/signing-key-status.js';
import { FakeKeyPairGenerator } from '../../testing/fake-key-pair-generator.js';
import { InMemorySigningKeyRepository } from '../../testing/in-memory-signing-key.repository.js';
import { SigningKeyProvisioner } from './signing-key-provisioner.js';

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
