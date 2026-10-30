import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { decodeJwt } from 'jose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import { CreateUserUseCase } from '../src/modules/users/application/use-cases/create-user.use-case.js';
import type { Env } from '../src/shared/infrastructure/config/env.schema.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';
import {
  authorizationQuery,
  pkce,
  signInThroughBrowser,
} from './support/browser-login.js';

interface TokenBody {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  scope: string;
}

describe('refresh_token grant (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const realmName = `refresh-${Date.now()}`;
  const tokenPath = `/realms/${realmName}/protocol/openid-connect/token`;
  const redirectUri = 'https://app.example.com/callback';
  const password = 'a-long-enough-password';

  const http = () => request(app.getHttpServer());

  async function tokensFor(clientId: string): Promise<{
    body: TokenBody;
    sessionCookie: string;
  }> {
    const login = await signInThroughBrowser(app, {
      realm: realmName,
      clientId,
      redirectUri,
      identifier: 'ana',
      password,
    });
    const { body } = await http()
      .post(tokenPath)
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: clientId,
        code: login.code,
        redirect_uri: redirectUri,
        code_verifier: login.pkce.verifier,
      })
      .expect(200);
    return { body: body as TokenBody, sessionCookie: login.sessionCookie };
  }

  const refresh = (refreshToken: string, extra: Record<string, string> = {}) =>
    http()
      .post(tokenPath)
      .type('form')
      .send({
        grant_type: 'refresh_token',
        client_id: 'app',
        refresh_token: refreshToken,
        ...extra,
      });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.realm.create({
      data: { name: realmName, displayName: 'Refresh Shop' },
    });
    const createClient = app.get(CreateClientUseCase);
    for (const [clientId, grantTypes] of [
      ['app', [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN]],
      ['other-app', [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN]],
      ['no-refresh', [GrantType.AUTHORIZATION_CODE]],
    ] as const) {
      await createClient.execute({
        realmName,
        clientId,
        name: clientId,
        type: ClientType.PUBLIC,
        redirectUris: [redirectUri],
        grantTypes: [...grantTypes],
      });
    }
    await app.get(CreateUserUseCase).execute({
      realmName,
      username: 'ana',
      email: 'ana@shop.example',
      password,
    });
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: realmName } });
    await app.close();
  });

  it('gives a refresh token only to clients allowed to use the grant', async () => {
    const withRefresh = await tokensFor('app');
    const withoutRefresh = await tokensFor('no-refresh');

    expect(withRefresh.body.refresh_token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(withoutRefresh.body.refresh_token).toBeUndefined();
  });

  it('rotates the refresh token on every use', async () => {
    const { body: first } = await tokensFor('app');

    const { body: second } = await refresh(first.refresh_token!)
      .expect(200)
      .expect('Cache-Control', 'no-store');

    expect(second).toMatchObject({
      access_token: expect.any(String),
      id_token: expect.any(String),
      refresh_token: expect.any(String),
      scope: 'openid profile email',
    });
    expect(second.refresh_token).not.toBe(first.refresh_token);
    expect(decodeJwt(second.access_token).sid).toBe(
      decodeJwt(first.access_token).sid,
    );
    expect(decodeJwt(second.id_token!)).not.toHaveProperty('nonce');
  });

  it('revokes the whole family and the session when a used refresh token comes back', async () => {
    const { body: first, sessionCookie } = await tokensFor('app');
    const { body: second } = await refresh(first.refresh_token!).expect(200);

    await refresh(first.refresh_token!)
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid_grant'));
    await refresh(second.refresh_token!)
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid_grant'));

    await http()
      .get(
        `/realms/${realmName}/protocol/openid-connect/auth?${authorizationQuery(
          {
            realm: realmName,
            clientId: 'app',
            redirectUri,
            identifier: 'ana',
            password,
          },
          pkce(),
        )}`,
      )
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect(({ text }) => expect(text).toContain('name="password"'));
  });

  it('narrows the scope of the access token without shrinking the refresh token', async () => {
    const { body: first } = await tokensFor('app');

    const { body: narrowed } = await refresh(first.refresh_token!, {
      scope: 'openid',
    }).expect(200);
    const { body: restored } = await refresh(narrowed.refresh_token!).expect(
      200,
    );

    expect(narrowed.scope).toBe('openid');
    expect(decodeJwt(narrowed.access_token).scope).toBe('openid');
    expect(restored.scope).toBe('openid profile email');
  });

  it('refuses to widen the scope', async () => {
    const { body } = await tokensFor('app');

    await refresh(body.refresh_token!, { scope: 'openid admin' })
      .expect(400)
      .expect(({ body: error }) => expect(error.error).toBe('invalid_scope'));
  });

  it('refuses a refresh token presented by another client', async () => {
    const { body } = await tokensFor('app');

    await refresh(body.refresh_token!, { client_id: 'other-app' })
      .expect(400)
      .expect(({ body: error }) => expect(error.error).toBe('invalid_grant'));
  });

  it('stops refreshing once the user is disabled', async () => {
    const { body } = await tokensFor('app');
    await prisma.user.updateMany({
      where: { username: 'ana', realm: { name: realmName } },
      data: { enabled: false },
    });

    try {
      await refresh(body.refresh_token!)
        .expect(400)
        .expect(({ body: error }) => expect(error.error).toBe('invalid_grant'));
    } finally {
      await prisma.user.updateMany({
        where: { username: 'ana', realm: { name: realmName } },
        data: { enabled: true },
      });
    }
  });

  it('stops refreshing once the client is disabled', async () => {
    const { body } = await tokensFor('app');
    await prisma.client.updateMany({
      where: { clientId: 'app', realm: { name: realmName } },
      data: { enabled: false },
    });

    try {
      await refresh(body.refresh_token!)
        .expect(401)
        .expect(({ body: error }) =>
          expect(error.error).toBe('invalid_client'),
        );
    } finally {
      await prisma.client.updateMany({
        where: { clientId: 'app', realm: { name: realmName } },
        data: { enabled: true },
      });
    }
  });

  it('requires the refresh token', () => {
    return http()
      .post(tokenPath)
      .type('form')
      .send({ grant_type: 'refresh_token', client_id: 'app' })
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid_request'));
  });

  it('keeps refreshing with the issuer of the realm', () => {
    const issuer = `${app
      .get<ConfigService<Env, true>>(ConfigService)
      .get('GATEHOUSE_ISSUER', { infer: true })}/realms/${realmName}`;

    return tokensFor('app').then(async ({ body }) => {
      const { body: refreshed } = await refresh(body.refresh_token!).expect(
        200,
      );
      expect(decodeJwt(refreshed.access_token).iss).toBe(issuer);
    });
  });
});
