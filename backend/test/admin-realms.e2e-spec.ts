import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AccessTokenIssuer } from '../src/modules/oidc/application/services/access-token-issuer.js';
import { RealmRepository } from '../src/modules/realms/domain/repositories/realm.repository.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Admin realms API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const shop = `admin-shop-${suffix}`;
  const broken = `admin-broken-${suffix}`;
  const tokens: Record<
    'global' | 'shopAdmin' | 'masterUser' | 'disabledShopAdmin',
    string
  > = { global: '', shopAdmin: '', masterUser: '', disabledShopAdmin: '' };

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

  const shopAdmin = {
    username: 'ana',
    email: 'ana@shop.example',
    password: 'a-long-enough-password',
  };

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
    tokens.global = await tokenFor('master', masterAdmin.userId);

    const master = await prisma.realm.findUniqueOrThrow({
      where: { name: 'master' },
    });
    const plainUser = await prisma.user.create({
      data: {
        realmId: master.id,
        username: `plain-${suffix}`,
        email: `plain-${suffix}@example.com`,
        passwordHash: 'unused',
      },
    });
    tokens.masterUser = await tokenFor('master', plainUser.id);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: `plain-${suffix}` } });
    await prisma.realm.deleteMany({ where: { name: { in: [shop, broken] } } });
    await app.close();
  });

  describe('POST /admin/realms', () => {
    it('requires a token', () => {
      return http()
        .post('/admin/realms')
        .send({ name: shop, displayName: 'Shop' })
        .expect(401);
    });

    it('is forbidden to a master user without the admin role', () => {
      return http()
        .post('/admin/realms')
        .auth(tokens.masterUser, { type: 'bearer' })
        .send({ name: shop, displayName: 'Shop' })
        .expect(403, {
          statusCode: 403,
          error: 'forbidden',
          message: 'Requires an admin of the master realm',
        });
    });

    it('creates the realm with its admin role, first admin and signing key', async () => {
      const { body } = await http()
        .post('/admin/realms')
        .auth(tokens.global, { type: 'bearer' })
        .send({
          name: shop,
          displayName: '  Shop  ',
          passwordMinLength: 14,
          accessTokenLifespan: 600,
          admin: shopAdmin,
        })
        .expect(201);

      expect(body).toEqual({
        id: expect.any(String),
        name: shop,
        displayName: 'Shop',
        enabled: true,
        loginIdentifier: 'USERNAME_OR_EMAIL',
        passwordMinLength: 14,
        accessTokenLifespan: 600,
        sessionIdleTimeout: 1800,
        sessionMaxLifespan: 36000,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const admins = await prisma.userRole.findMany({
        where: { role: { name: 'admin', realm: { name: shop } } },
        include: { user: true },
      });
      expect(admins.map(({ user }) => user.username)).toEqual(['ana']);
      await expect(
        prisma.signingKey.count({
          where: { realm: { name: shop }, status: 'ACTIVE' },
        }),
      ).resolves.toBe(1);

      tokens.shopAdmin = await tokenFor(shop, admins[0].userId);
    });

    it('rejects a realm name that already exists', () => {
      return http()
        .post('/admin/realms')
        .auth(tokens.global, { type: 'bearer' })
        .send({ name: shop, displayName: 'Shop again' })
        .expect(409)
        .expect(({ body }) => expect(body.error).toBe('realm_already_exists'));
    });

    it('rejects a realm name that cannot appear in a URL', () => {
      return http()
        .post('/admin/realms')
        .auth(tokens.global, { type: 'bearer' })
        .send({ name: 'Shop/EU', displayName: 'Shop' })
        .expect(422)
        .expect(({ body }) =>
          expect(body.error).toBe('invalid_realm_configuration'),
        );
    });

    it('rejects a malformed body', () => {
      return http()
        .post('/admin/realms')
        .auth(tokens.global, { type: 'bearer' })
        .send({ name: broken })
        .expect(400)
        .expect(({ body }) => expect(body.error).toBe('validation_failed'));
    });

    it('creates nothing when the first admin breaks the realm rules', async () => {
      await http()
        .post('/admin/realms')
        .auth(tokens.global, { type: 'bearer' })
        .send({
          name: broken,
          displayName: 'Broken',
          passwordMinLength: 20,
          admin: { ...shopAdmin, password: 'only-sixteen-ch' },
        })
        .expect(422)
        .expect(({ body }) => expect(body.error).toBe('weak_password'));

      await expect(
        prisma.realm.count({ where: { name: broken } }),
      ).resolves.toBe(0);
    });
  });

  describe('GET /admin/realms', () => {
    it('lists every realm to a global admin', async () => {
      const { body } = await http()
        .get('/admin/realms')
        .auth(tokens.global, { type: 'bearer' })
        .expect(200);

      expect(body.map((realm: { name: string }) => realm.name)).toEqual(
        expect.arrayContaining(['master', shop]),
      );
    });

    it('is forbidden to a realm admin', () => {
      return http()
        .get('/admin/realms')
        .auth(tokens.shopAdmin, { type: 'bearer' })
        .expect(403);
    });
  });

  describe('GET /admin/realms/:realm', () => {
    it('lets a global admin read any realm', () => {
      return http()
        .get(`/admin/realms/${shop}`)
        .auth(tokens.global, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.name).toBe(shop));
    });

    it('lets a realm admin read its own realm', () => {
      return http()
        .get(`/admin/realms/${shop}`)
        .auth(tokens.shopAdmin, { type: 'bearer' })
        .expect(200)
        .expect(({ body }) => expect(body.name).toBe(shop));
    });

    it.each(['master', 'some-other-realm'])(
      'keeps a realm admin out of %s',
      async (realmName) => {
        await http()
          .get(`/admin/realms/${realmName}`)
          .auth(tokens.shopAdmin, { type: 'bearer' })
          .expect(403);
      },
    );

    it('answers 404 to a global admin for an unknown realm', () => {
      return http()
        .get(`/admin/realms/missing-${suffix}`)
        .auth(tokens.global, { type: 'bearer' })
        .expect(404);
    });

    it('is forbidden to a client token, which has no user behind it', async () => {
      const master = await app.get(RealmRepository).findByName('master');
      const { token } = await app.get(AccessTokenIssuer).issue({
        realm: master!,
        subject: '01a00000-0000-7000-8000-000000000000',
        clientId: 'billing',
      });

      await http()
        .get(`/admin/realms/${shop}`)
        .auth(token, { type: 'bearer' })
        .expect(403);
    });

    it('stops accepting a realm admin as soon as the user is disabled', async () => {
      await prisma.user.updateMany({
        where: { username: 'ana', realm: { name: shop } },
        data: { enabled: false },
      });

      try {
        await http()
          .get(`/admin/realms/${shop}`)
          .auth(tokens.shopAdmin, { type: 'bearer' })
          .expect(403);
      } finally {
        await prisma.user.updateMany({
          where: { username: 'ana', realm: { name: shop } },
          data: { enabled: true },
        });
      }
    });
  });

  describe('PATCH /admin/realms/:realm', () => {
    const patch = (realmName: string, token: string, body: object) =>
      http()
        .patch(`/admin/realms/${realmName}`)
        .auth(token, { type: 'bearer' })
        .send(body);

    it('lets a realm admin change the settings of its realm', async () => {
      const { body } = await patch(shop, tokens.shopAdmin, {
        displayName: ' Shop Europe ',
        passwordMinLength: 16,
        accessTokenLifespan: 900,
      }).expect(200);

      expect(body).toMatchObject({
        name: shop,
        displayName: 'Shop Europe',
        passwordMinLength: 16,
        accessTokenLifespan: 900,
        enabled: true,
      });
    });

    it('refuses to rename a realm', () => {
      return patch(shop, tokens.global, { name: 'renamed' })
        .expect(400)
        .expect(({ body }) => expect(body.error).toBe('validation_failed'));
    });

    it.each([
      ['a token lifespan below one minute', { accessTokenLifespan: 5 }],
      [
        'an idle timeout longer than the current max lifespan',
        { sessionIdleTimeout: 40000 },
      ],
    ])('rejects %s', async (_case, changes) => {
      await patch(shop, tokens.shopAdmin, changes)
        .expect(422)
        .expect(({ body }) =>
          expect(body.error).toBe('invalid_realm_configuration'),
        );
    });

    it('changes the session lifespans of a realm', () => {
      return patch(shop, tokens.shopAdmin, {
        sessionIdleTimeout: 900,
        sessionMaxLifespan: 7200,
      })
        .expect(200)
        .expect(({ body }) =>
          expect(body).toMatchObject({
            sessionIdleTimeout: 900,
            sessionMaxLifespan: 7200,
          }),
        );
    });

    it('does not let a realm admin disable its own realm', () => {
      return patch(shop, tokens.shopAdmin, { enabled: false })
        .expect(403)
        .expect(({ body }) =>
          expect(body.error).toBe('realm_status_requires_global_admin'),
        );
    });

    it('never disables master', () => {
      return patch('master', tokens.global, { enabled: false })
        .expect(422)
        .expect(({ body }) =>
          expect(body.error).toBe('master_realm_cannot_be_disabled'),
        );
    });

    it('lets a global admin disable a realm, which locks its tokens out', async () => {
      await patch(shop, tokens.global, { enabled: false }).expect(200);

      try {
        await http()
          .get(`/admin/realms/${shop}`)
          .auth(tokens.shopAdmin, { type: 'bearer' })
          .expect(401);
      } finally {
        await patch(shop, tokens.global, { enabled: true }).expect(200);
      }
    });
  });
});
