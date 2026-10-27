import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CompactSign,
  createLocalJWKSet,
  compactVerify,
  importPKCS8,
} from 'jose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { SigningKeyProvisioner } from '../src/modules/signing-keys/application/services/signing-key-provisioner.js';
import { KeyEncryptor } from '../src/shared/application/crypto/key-encryptor.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('JWKS endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const realmName = `jwks-${Date.now()}`;
  const certsPath = (realm: string) =>
    `/realms/${realm}/protocol/openid-connect/certs`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: realmName } });
    await app.close();
  });

  it('publishes the realm keys without authentication', async () => {
    const realm = await prisma.realm.create({
      data: { name: realmName, displayName: 'JWKS' },
    });
    const key = await app.get(SigningKeyProvisioner).ensureActive(realm.id);

    const response = await request(app.getHttpServer())
      .get(certsPath(realmName))
      .expect(200)
      .expect('Cache-Control', 'public, max-age=300')
      .expect('Content-Type', /application\/json/);

    expect(response.body).toEqual({
      keys: [
        {
          kty: 'EC',
          crv: 'P-256',
          x: key.publicJwk.x,
          y: key.publicJwk.y,
          kid: key.id,
          alg: 'ES256',
          use: 'sig',
        },
      ],
    });
  });

  it('lets a resource server verify a token signed with the active key', async () => {
    const realm = await prisma.realm.findUniqueOrThrow({
      where: { name: realmName },
    });
    const key = await app.get(SigningKeyProvisioner).ensureActive(realm.id);
    const privateKey = await importPKCS8(
      app.get(KeyEncryptor).decrypt(key.encryptedPrivateKey),
      'ES256',
    );
    const jws = await new CompactSign(new TextEncoder().encode('hello'))
      .setProtectedHeader({ alg: 'ES256', kid: key.kid })
      .sign(privateKey);

    const { body } = await request(app.getHttpServer())
      .get(certsPath(realmName))
      .expect(200);
    const { payload } = await compactVerify(jws, createLocalJWKSet(body));

    expect(new TextDecoder().decode(payload)).toBe('hello');
  });

  it('answers 404 for an unknown realm', async () => {
    const response = await request(app.getHttpServer())
      .get(certsPath(`missing-${Date.now()}`))
      .expect(404);

    expect(response.body).toMatchObject({ error: 'realm_not_found' });
  });
});
