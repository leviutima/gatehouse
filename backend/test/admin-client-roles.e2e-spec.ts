import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/modules/oidc/application/services/access-token-issuer.js';
import { RealmRepository } from '../src/modules/realms/domain/repositories/realm.repository.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Admin client roles API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const shop = `client-roles-shop-${suffix}`;
  const other = `client-roles-other-${suffix}`;
  const realmPath = `/admin/realms/${shop}`;
  const password = 'a-long-enough-password';
  let globalToken: string;
  let shopToken: string;
  let otherToken: string;
  let bobId: string;

  const http = () => request(app.getHttpServer());
  const clientRoles = (clientId: string) =>
    `${realmPath}/clients/${clientId}/roles`;
  const userClientRoles = (userId: string, clientId: string) =>
    `${realmPath}/users/${userId}/client-roles/${clientId}`;
  const roleNames = (body: { name: string }[]) => body.map(({ name }) => name);

  async function tokenFor(realmName: string, userId: string): Promise<string> {
    const realm = await app.get(RealmRepository).findByName(realmName);
    const { token } = await app.get(AccessTokenIssuer).issue({
      realm: realm!,
      subject: userId,
      clientId: 'admin-console',
    });
    return token;
  }

  async function createRealmWithAdmin(name: string, username: string) {
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

  async function createClient(clientId: string) {
    await http()
      .post(`${realmPath}/clients`)
      .auth(shopToken, { type: 'bearer' })
      .send({
        clientId,
        name: clientId,
        type: 'CONFIDENTIAL',
        grantTypes: ['CLIENT_CREDENTIALS'],
      })
      .expect(201);
  }

  async function createRole(path: string, name: string) {
    await http()
      .post(path)
      .auth(shopToken, { type: 'bearer' })
      .send({ name })
      .expect(201);
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
    globalToken = await tokenFor('master', masterAdmin.userId);
    shopToken = await createRealmWithAdmin(shop, 'ana');
    otherToken = await createRealmWithAdmin(other, 'olga');

    const { body } = await http()
      .post(`${realmPath}/users`)
      .auth(shopToken, { type: 'bearer' })
      .send({ username: 'bob', email: 'bob@shop.example', password })
      .expect(201);
    bobId = body.id;

    await createClient('billing');
    await createClient('orders');
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: { in: [shop, other] } } });
    await app.close();
  });

  it('keeps the admin of another realm out', () => {
    return http()
      .get(clientRoles('billing'))
      .auth(otherToken, { type: 'bearer' })
      .expect(403);
  });

  it('answers 404 for a client the realm does not have', () => {
    return http()
      .get(clientRoles('ghost'))
      .auth(shopToken, { type: 'bearer' })
      .expect(404)
      .expect(({ body }) => expect(body.error).toBe('client_not_found'));
  });

  it('creates a client role', async () => {
    const { body } = await http()
      .post(clientRoles('billing'))
      .auth(shopToken, { type: 'bearer' })
      .send({ name: 'viewer', description: ' Reads invoices ' })
      .expect(201);

    expect(body).toEqual({
      id: expect.any(String),
      name: 'viewer',
      description: 'Reads invoices',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('rejects a name already taken in the same client', () => {
    return http()
      .post(clientRoles('billing'))
      .auth(shopToken, { type: 'bearer' })
      .send({ name: 'viewer' })
      .expect(409);
  });

  it('lets the same name live in another client, in the realm and as admin', async () => {
    await createRole(clientRoles('orders'), 'viewer');
    await createRole(`${realmPath}/roles`, 'viewer');
    await createRole(clientRoles('billing'), 'admin');

    const billing = await http()
      .get(clientRoles('billing'))
      .auth(shopToken, { type: 'bearer' })
      .expect(200);
    const orders = await http()
      .get(clientRoles('orders'))
      .auth(shopToken, { type: 'bearer' })
      .expect(200);
    const realm = await http()
      .get(`${realmPath}/roles`)
      .auth(shopToken, { type: 'bearer' })
      .expect(200);

    expect(roleNames(billing.body)).toEqual(['admin', 'viewer']);
    expect(roleNames(orders.body)).toEqual(['viewer']);
    expect(roleNames(realm.body)).toEqual(['admin', 'viewer']);
  });

  it('gives a client role to a user idempotently, apart from the realm roles', async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      await http()
        .put(`${userClientRoles(bobId, 'billing')}/viewer`)
        .auth(shopToken, { type: 'bearer' })
        .expect(204);
    }

    const billing = await http()
      .get(userClientRoles(bobId, 'billing'))
      .auth(shopToken, { type: 'bearer' })
      .expect(200);
    const orders = await http()
      .get(userClientRoles(bobId, 'orders'))
      .auth(shopToken, { type: 'bearer' })
      .expect(200);
    const realm = await http()
      .get(`${realmPath}/users/${bobId}/roles`)
      .auth(shopToken, { type: 'bearer' })
      .expect(200);

    expect(roleNames(billing.body)).toEqual(['viewer']);
    expect(orders.body).toEqual([]);
    expect(realm.body).toEqual([]);
  });

  it('answers 404 for a role that belongs to another client', async () => {
    await createRole(clientRoles('billing'), 'invoices:write');

    await http()
      .put(`${userClientRoles(bobId, 'orders')}/invoices:write`)
      .auth(shopToken, { type: 'bearer' })
      .expect(404)
      .expect(({ body }) => expect(body.error).toBe('role_not_found'));
  });

  it('does not make a user a realm admin through a client role called admin', async () => {
    await http()
      .put(`${userClientRoles(bobId, 'billing')}/admin`)
      .auth(shopToken, { type: 'bearer' })
      .expect(204);

    const bobToken = await tokenFor(shop, bobId);
    await http().get(realmPath).auth(bobToken, { type: 'bearer' }).expect(403);
  });

  it('takes a client role called admin from its only holder', async () => {
    await http()
      .delete(`${userClientRoles(bobId, 'billing')}/admin`)
      .auth(shopToken, { type: 'bearer' })
      .expect(204);

    await http()
      .delete(`${clientRoles('billing')}/admin`)
      .auth(shopToken, { type: 'bearer' })
      .expect(204);
  });

  it('deletes a client role together with its assignments', async () => {
    await http()
      .delete(`${clientRoles('billing')}/viewer`)
      .auth(globalToken, { type: 'bearer' })
      .expect(204);

    const { body } = await http()
      .get(userClientRoles(bobId, 'billing'))
      .auth(globalToken, { type: 'bearer' })
      .expect(200);
    expect(body).toEqual([]);

    const orders = await http()
      .get(clientRoles('orders'))
      .auth(globalToken, { type: 'bearer' })
      .expect(200);
    expect(roleNames(orders.body)).toEqual(['viewer']);
  });
});
