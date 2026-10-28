import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/modules/oidc/application/services/access-token-issuer.js';
import { RealmRepository } from '../src/modules/realms/domain/repositories/realm.repository.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Admin clients API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const shop = `clients-shop-${suffix}`;
  const other = `clients-other-${suffix}`;
  const clientsPath = `/admin/realms/${shop}/clients`;
  const tokenPath = `/realms/${shop}/protocol/openid-connect/token`;
  const password = 'a-long-enough-password';
  let shopToken: string;
  let otherToken: string;
  let billingSecret: string;

  const http = () => request(app.getHttpServer());

  const requestToken = (clientSecret: string) =>
    http()
      .post(tokenPath)
      .type('form')
      .auth('billing', clientSecret)
      .send({ grant_type: 'client_credentials' });

  async function tokenFor(realmName: string, userId: string): Promise<string> {
    const realm = await app.get(RealmRepository).findByName(realmName);
    const { token } = await app.get(AccessTokenIssuer).issue({
      realm: realm!,
      subject: userId,
      clientId: 'admin-console',
    });
    return token;
  }

  async function createRealmWithAdmin(
    globalToken: string,
    name: string,
    username: string,
  ): Promise<string> {
    await http()
      .post('/admin/realms')
      .auth(globalToken, { type: 'bearer' })
      .send({
        name,
        displayName: name,
        admin: { username, email: `${username}@${name}.example`, password },
      })
      .expect(201);
    const admin = await prisma.user.findFirstOrThrow({
      where: { username, realm: { name } },
    });
    return tokenFor(name, admin.id);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const masterAdmin = await prisma.userRole.findFirstOrThrow({
      where: { role: { name: 'admin', realm: { name: 'master' } } },
    });
    const globalToken = await tokenFor('master', masterAdmin.userId);
    shopToken = await createRealmWithAdmin(globalToken, shop, 'ana');
    otherToken = await createRealmWithAdmin(globalToken, other, 'olga');
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: { in: [shop, other] } } });
    await app.close();
  });

  it('keeps the admin of another realm out', () => {
    return http()
      .get(clientsPath)
      .auth(otherToken, { type: 'bearer' })
      .expect(403);
  });

  it('creates a confidential client whose secret is shown once and works', async () => {
    const { body } = await http()
      .post(clientsPath)
      .auth(shopToken, { type: 'bearer' })
      .send({
        clientId: 'billing',
        name: 'Billing',
        type: 'CONFIDENTIAL',
        grantTypes: ['CLIENT_CREDENTIALS'],
      })
      .expect(201)
      .expect('Cache-Control', 'no-store');

    expect(body).toEqual({
      id: expect.any(String),
      clientId: 'billing',
      name: 'Billing',
      type: 'CONFIDENTIAL',
      redirectUris: [],
      postLogoutRedirectUris: [],
      grantTypes: ['CLIENT_CREDENTIALS'],
      enabled: true,
      secret: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    billingSecret = body.secret;

    await requestToken(billingSecret).expect(200);
  });

  it('creates a public client without a secret', async () => {
    const { body } = await http()
      .post(clientsPath)
      .auth(shopToken, { type: 'bearer' })
      .send({
        clientId: 'web',
        name: 'Web',
        type: 'PUBLIC',
        redirectUris: ['https://app.example.com/callback'],
        grantTypes: ['AUTHORIZATION_CODE'],
      })
      .expect(201);

    expect(body.secret).toBeNull();
  });

  it('rejects a client id already taken in the realm', () => {
    return http()
      .post(clientsPath)
      .auth(shopToken, { type: 'bearer' })
      .send({
        clientId: 'billing',
        name: 'Billing again',
        type: 'CONFIDENTIAL',
        grantTypes: ['CLIENT_CREDENTIALS'],
      })
      .expect(409);
  });

  it.each([
    [
      'an invalid client id',
      {
        clientId: 'my client',
        type: 'CONFIDENTIAL',
        grantTypes: ['CLIENT_CREDENTIALS'],
      },
    ],
    [
      'a public client using client_credentials',
      { clientId: 'cli', type: 'PUBLIC', grantTypes: ['CLIENT_CREDENTIALS'] },
    ],
  ])('rejects %s', async (_case, overrides) => {
    await http()
      .post(clientsPath)
      .auth(shopToken, { type: 'bearer' })
      .send({ name: 'Client', ...overrides })
      .expect(422)
      .expect(({ body }) =>
        expect(body.error).toBe('invalid_client_configuration'),
      );
  });

  it('lists and reads clients without ever exposing a secret', async () => {
    const { body: list } = await http()
      .get(clientsPath)
      .auth(shopToken, { type: 'bearer' })
      .expect(200);
    const { body: billing } = await http()
      .get(`${clientsPath}/billing`)
      .auth(shopToken, { type: 'bearer' })
      .expect(200);

    expect(list.map(({ clientId }: { clientId: string }) => clientId)).toEqual([
      'billing',
      'web',
    ]);
    expect(billing.clientId).toBe('billing');
    expect(JSON.stringify([list, billing])).not.toMatch(/secret/i);
  });

  it('answers 404 for an unknown client', () => {
    return http()
      .get(`${clientsPath}/ghost`)
      .auth(shopToken, { type: 'bearer' })
      .expect(404)
      .expect(({ body }) => expect(body.error).toBe('client_not_found'));
  });

  it('registers where the browser may return after logout', async () => {
    await http()
      .patch(`${clientsPath}/web`)
      .auth(shopToken, { type: 'bearer' })
      .send({ postLogoutRedirectUris: ['https://app.example.com/signed-out'] })
      .expect(200)
      .expect(({ body }) =>
        expect(body.postLogoutRedirectUris).toEqual([
          'https://app.example.com/signed-out',
        ]),
      );
    await http()
      .patch(`${clientsPath}/web`)
      .auth(shopToken, { type: 'bearer' })
      .send({ postLogoutRedirectUris: ['javascript:alert(1)'] })
      .expect(422);
  });

  it('updates the redirect URIs of a client', async () => {
    await http()
      .patch(`${clientsPath}/web`)
      .auth(shopToken, { type: 'bearer' })
      .send({ redirectUris: ['https://app.example.com/cb'] })
      .expect(200)
      .expect(({ body }) =>
        expect(body.redirectUris).toEqual(['https://app.example.com/cb']),
      );
  });

  it('rejects an update that breaks the client rules', () => {
    return http()
      .patch(`${clientsPath}/web`)
      .auth(shopToken, { type: 'bearer' })
      .send({ redirectUris: ['javascript:alert(1)'] })
      .expect(422);
  });

  it('refuses to change the client id or the type', () => {
    return http()
      .patch(`${clientsPath}/web`)
      .auth(shopToken, { type: 'bearer' })
      .send({ type: 'CONFIDENTIAL' })
      .expect(400);
  });

  it('stops issuing tokens to a disabled client', async () => {
    await http()
      .patch(`${clientsPath}/billing`)
      .auth(shopToken, { type: 'bearer' })
      .send({ enabled: false })
      .expect(200);

    try {
      await requestToken(billingSecret).expect(401);
    } finally {
      await http()
        .patch(`${clientsPath}/billing`)
        .auth(shopToken, { type: 'bearer' })
        .send({ enabled: true })
        .expect(200);
    }
  });

  it('replaces the secret, so only the new one works', async () => {
    const { body } = await http()
      .post(`${clientsPath}/billing/secret`)
      .auth(shopToken, { type: 'bearer' })
      .expect(200)
      .expect('Cache-Control', 'no-store');

    expect(body.secret).not.toBe(billingSecret);
    await requestToken(billingSecret).expect(401);
    await requestToken(body.secret).expect(200);
  });

  it('refuses to give a public client a secret', () => {
    return http()
      .post(`${clientsPath}/web/secret`)
      .auth(shopToken, { type: 'bearer' })
      .expect(422)
      .expect(({ body }) =>
        expect(body.error).toBe('public_client_has_no_secret'),
      );
  });
});
