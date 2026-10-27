import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CompactSign, compactVerify, importJWK, importPKCS8 } from 'jose';
import { AppModule } from '../src/app.module.js';
import { SigningKeyProvisioner } from '../src/modules/signing-keys/application/services/signing-key-provisioner.js';
import { ActiveSigningKeyAlreadyExistsError } from '../src/modules/signing-keys/domain/errors/active-signing-key-already-exists.error.js';
import { SigningKeyRepository } from '../src/modules/signing-keys/domain/repositories/signing-key.repository.js';
import { SigningKeyStatus } from '../src/modules/signing-keys/domain/signing-key-status.js';
import { KeyEncryptor } from '../src/shared/application/crypto/key-encryptor.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Signing keys (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let provisioner: SigningKeyProvisioner;
  let keys: SigningKeyRepository;
  let realmId: string;
  const realmName = `keys-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    provisioner = app.get(SigningKeyProvisioner);
    keys = app.get(SigningKeyRepository);

    ({ id: realmId } = await prisma.realm.create({
      data: { name: realmName, displayName: 'Keys' },
    }));
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: realmName } });
    await app.close();
  });

  it('stores the private key encrypted and reusable for signing', async () => {
    const key = await provisioner.ensureActive(realmId);

    const row = await prisma.signingKey.findUniqueOrThrow({
      where: { id: key.id },
    });
    expect(row.encryptedPrivateKey).toMatch(/^v1\./);
    expect(row.encryptedPrivateKey).not.toContain('PRIVATE KEY');
    expect(row.publicJwk).not.toHaveProperty('d');

    const privateKey = await importPKCS8(
      app.get(KeyEncryptor).decrypt(row.encryptedPrivateKey),
      'ES256',
    );
    const jws = await new CompactSign(new TextEncoder().encode('hello'))
      .setProtectedHeader({ alg: 'ES256', kid: key.kid })
      .sign(privateKey);
    const { protectedHeader } = await compactVerify(
      jws,
      await importJWK(key.toPublishedJwk(), 'ES256'),
    );
    expect(protectedHeader.kid).toBe(key.id);
  });

  it('returns the same active key on later calls', async () => {
    const first = await provisioner.ensureActive(realmId);
    const second = await provisioner.ensureActive(realmId);

    expect(second.id).toBe(first.id);
    await expect(prisma.signingKey.count({ where: { realmId } })).resolves.toBe(
      1,
    );
  });

  it('refuses a second active key for the realm', async () => {
    const active = await provisioner.ensureActive(realmId);

    await expect(
      keys.create({
        realmId,
        algorithm: 'ES256',
        status: SigningKeyStatus.ACTIVE,
        publicJwk: active.publicJwk,
        encryptedPrivateKey: active.encryptedPrivateKey,
      }),
    ).rejects.toBeInstanceOf(ActiveSigningKeyAlreadyExistsError);
  });

  it('publishes the active and passive keys, newest first', async () => {
    const active = await provisioner.ensureActive(realmId);
    const passive = await keys.create({
      realmId,
      algorithm: 'ES256',
      status: SigningKeyStatus.PASSIVE,
      publicJwk: active.publicJwk,
      encryptedPrivateKey: active.encryptedPrivateKey,
    });

    const published = await keys.findPublished(realmId);

    expect(published.map((key) => key.id)).toEqual([passive.id, active.id]);
  });
});
