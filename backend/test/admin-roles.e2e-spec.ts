import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/modules/oidc/application/services/access-token-issuer.js';
import { RealmRepository } from '../src/modules/realms/domain/repositories/realm.repository.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Admin roles API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const shop = `roles-api-shop-${suffix}`;
  const other = `roles-api-other-${suffix}`;
  const realmPath = `/admin/realms/${shop}`;
  const password = 'a-long-enough-password';
  let globalToken: string;
  let shopToken: string;
  let otherToken: string;
  let anaId: string;
  let bobId: string;

  const http = () => request(app.getHttpServer());
  const userRoles = (userId: string) => `${realmPath}/users/${userId}/roles`;
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
    return { id: admin.id, token: await tokenFor(name, admin.id) };
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
    ({ id: anaId, token: shopToken } = await createRealmWithAdmin(shop, 'ana'));
    ({ token: otherToken } = await createRealmWithAdmin(other, 'olga'));

    const { body } = await http()
      .post(`${realmPath}/users`)
      .auth(shopToken, { type: 'bearer' })
      .send({ username: 'bob', email: 'bob@shop.example', password })
      .expect(201);
    bobId = body.id;
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: { in: [shop, other] } } });
    await app.close();
  });

  it('keeps the admin of another realm out', () => {
    return http()
      .get(`${realmPath}/roles`)
      .auth(otherToken, { type: 'bearer' })
      .expect(403);
  });

  it('starts every realm with the admin role', async () => {
    const { body } = await http()
      .get(`${realmPath}/roles`)
      .auth(shopToken, { type: 'bearer' })
      .expect(200);

    expect(roleNames(body)).toEqual(['admin']);
  });

  it('creates a role', async () => {
    const { body } = await http()
      .post(`${realmPath}/roles`)
      .auth(shopToken, { type: 'bearer' })
      .send({ name: 'billing:read', description: ' Reads invoices ' })
      .expect(201);

    expect(body).toEqual({
      id: expect.any(String),
      name: 'billing:read',
      description: 'Reads invoices',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it.each(['billing:read', 'admin'])(
    'rejects a role name already taken: %s',
    async (name) => {
      await http()
        .post(`${realmPath}/roles`)
        .auth(shopToken, { type: 'bearer' })
        .send({ name })
        .expect(409);
    },
  );

  it('rejects an invalid role name', () => {
    return http()
      .post(`${realmPath}/roles`)
      .auth(shopToken, { type: 'bearer' })
      .send({ name: 'billing read' })
      .expect(422)
      .expect(({ body }) => expect(body.error).toBe('invalid_role_name'));
  });

  it('gives a role to a user idempotently', async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      await http()
        .put(`${userRoles(bobId)}/billing:read`)
        .auth(shopToken, { type: 'bearer' })
        .expect(204);
    }

    const { body } = await http()
      .get(userRoles(bobId))
      .auth(shopToken, { type: 'bearer' })
      .expect(200);
    expect(roleNames(body)).toEqual(['billing:read']);
  });

  it('answers 404 for a role the realm does not have', () => {
    return http()
      .put(`${userRoles(bobId)}/ghost`)
      .auth(shopToken, { type: 'bearer' })
      .expect(404)
      .expect(({ body }) => expect(body.error).toBe('role_not_found'));
  });

  it('makes a user an admin of the realm through the API', async () => {
    const bobToken = await tokenFor(shop, bobId);
    await http().get(realmPath).auth(bobToken, { type: 'bearer' }).expect(403);

    await http()
      .put(`${userRoles(bobId)}/admin`)
      .auth(shopToken, { type: 'bearer' })
      .expect(204);

    await http().get(realmPath).auth(bobToken, { type: 'bearer' }).expect(200);
  });

  it('takes the admin role away while another enabled admin remains, cutting access at once', async () => {
    await http()
      .delete(`${userRoles(anaId)}/admin`)
      .auth(globalToken, { type: 'bearer' })
      .expect(204);

    await http().get(realmPath).auth(shopToken, { type: 'bearer' }).expect(403);
  });

  it('refuses to take the admin role from the last enabled admin', () => {
    return http()
      .delete(`${userRoles(bobId)}/admin`)
      .auth(globalToken, { type: 'bearer' })
      .expect(409)
      .expect(({ body }) => expect(body.error).toBe('last_realm_admin'));
  });

  it('refuses to delete the reserved admin role', () => {
    return http()
      .delete(`${realmPath}/roles/admin`)
      .auth(globalToken, { type: 'bearer' })
      .expect(422)
      .expect(({ body }) => expect(body.error).toBe('reserved_role'));
  });

  it('deletes a role together with its assignments', async () => {
    await http()
      .delete(`${realmPath}/roles/billing:read`)
      .auth(globalToken, { type: 'bearer' })
      .expect(204);

    const { body } = await http()
      .get(userRoles(bobId))
      .auth(globalToken, { type: 'bearer' })
      .expect(200);
    expect(roleNames(body)).toEqual(['admin']);
  });
});
