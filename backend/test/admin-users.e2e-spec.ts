import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/modules/oidc/application/services/access-token-issuer.js';
import { RealmRepository } from '../src/modules/realms/domain/repositories/realm.repository.js';
import { AdminRoleProvisioner } from '../src/modules/roles/application/services/admin-role-provisioner.js';
import { PasswordHasher } from '../src/shared/application/crypto/password-hasher.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Admin users API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const shop = `users-shop-${suffix}`;
  const other = `users-other-${suffix}`;
  const usersPath = `/admin/realms/${shop}/users`;
  const password = 'a-long-enough-password';
  let globalToken: string;
  let shopToken: string;
  let otherToken: string;
  let anaId: string;
  let bobId: string;
  let otherAdminId: string;

  const http = () => request(app.getHttpServer());

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
    ({ id: otherAdminId, token: otherToken } = await createRealmWithAdmin(
      other,
      'olga',
    ));
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: { in: [shop, other] } } });
    await app.close();
  });

  it('requires a token', () => {
    return http().get(usersPath).expect(401);
  });

  it('keeps the admin of another realm out', () => {
    return http()
      .get(usersPath)
      .auth(otherToken, { type: 'bearer' })
      .expect(403);
  });

  it('creates a user without ever returning the password hash', async () => {
    const { body } = await http()
      .post(usersPath)
      .auth(shopToken, { type: 'bearer' })
      .send({ username: 'bob', email: 'bob@shop.example', password })
      .expect(201);

    expect(body).toEqual({
      id: expect.any(String),
      username: 'bob',
      email: 'bob@shop.example',
      emailVerified: false,
      enabled: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    bobId = body.id;
  });

  it('rejects a duplicate user', () => {
    return http()
      .post(usersPath)
      .auth(shopToken, { type: 'bearer' })
      .send({ username: 'BOB', email: 'other@shop.example', password })
      .expect(409);
  });

  it('applies the realm password policy on creation', () => {
    return http()
      .post(usersPath)
      .auth(shopToken, { type: 'bearer' })
      .send({
        username: 'carla',
        email: 'carla@shop.example',
        password: 'short',
      })
      .expect(422)
      .expect(({ body }) => expect(body.error).toBe('weak_password'));
  });

  it('lists the users of the realm in pages', async () => {
    const { body: all } = await http()
      .get(usersPath)
      .auth(shopToken, { type: 'bearer' })
      .expect(200);
    const { body: second } = await http()
      .get(`${usersPath}?offset=1&limit=1`)
      .auth(shopToken, { type: 'bearer' })
      .expect(200);

    expect(all.map((user: { username: string }) => user.username)).toEqual([
      'ana',
      'bob',
    ]);
    expect(second.map((user: { username: string }) => user.username)).toEqual([
      'bob',
    ]);
  });

  it('rejects a page larger than 200', () => {
    return http()
      .get(`${usersPath}?limit=500`)
      .auth(shopToken, { type: 'bearer' })
      .expect(400);
  });

  it('lets a global admin manage the users of any realm', () => {
    return http()
      .get(`${usersPath}/${bobId}`)
      .auth(globalToken, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => expect(body.username).toBe('bob'));
  });

  it('does not find a user of another realm through this realm', () => {
    return http()
      .get(`${usersPath}/${otherAdminId}`)
      .auth(globalToken, { type: 'bearer' })
      .expect(404)
      .expect(({ body }) => expect(body.error).toBe('user_not_found'));
  });

  it('rejects an id that is not a UUID', () => {
    return http()
      .get(`${usersPath}/not-a-uuid`)
      .auth(shopToken, { type: 'bearer' })
      .expect(400);
  });

  it('disables and re-enables a user', async () => {
    await http()
      .patch(`${usersPath}/${bobId}`)
      .auth(shopToken, { type: 'bearer' })
      .send({ enabled: false, emailVerified: true })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ enabled: false, emailVerified: true }),
      );
    await http()
      .patch(`${usersPath}/${bobId}`)
      .auth(shopToken, { type: 'bearer' })
      .send({ enabled: true })
      .expect(200);
  });

  it('rejects fields it cannot change', () => {
    return http()
      .patch(`${usersPath}/${bobId}`)
      .auth(shopToken, { type: 'bearer' })
      .send({ username: 'robert' })
      .expect(400);
  });

  it('refuses to disable the last enabled admin of the realm', () => {
    return http()
      .patch(`${usersPath}/${anaId}`)
      .auth(globalToken, { type: 'bearer' })
      .send({ enabled: false })
      .expect(409)
      .expect(({ body }) => expect(body.error).toBe('last_realm_admin'));
  });

  it('disables an admin once another enabled admin remains', async () => {
    const realm = await app.get(RealmRepository).findByName(shop);
    await app.get(AdminRoleProvisioner).grantAdmin(realm!.id, bobId);

    await http()
      .patch(`${usersPath}/${anaId}`)
      .auth(globalToken, { type: 'bearer' })
      .send({ enabled: false })
      .expect(200);
    await http()
      .patch(`${usersPath}/${anaId}`)
      .auth(globalToken, { type: 'bearer' })
      .send({ enabled: true })
      .expect(200);
  });

  it('sets a new password that follows the realm policy', async () => {
    await http()
      .put(`${usersPath}/${bobId}/password`)
      .auth(shopToken, { type: 'bearer' })
      .send({ password: 'short' })
      .expect(422);
    await http()
      .put(`${usersPath}/${bobId}/password`)
      .auth(shopToken, { type: 'bearer' })
      .send({ password: 'a-brand-new-password' })
      .expect(204);

    const bob = await prisma.user.findUniqueOrThrow({ where: { id: bobId } });
    await expect(
      app.get(PasswordHasher).verify(bob.passwordHash, 'a-brand-new-password'),
    ).resolves.toBe(true);
  });
});
