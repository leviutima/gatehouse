import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request, { Response } from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import { CreateUserUseCase } from '../src/modules/users/application/use-cases/create-user.use-case.js';
import type { Env } from '../src/shared/infrastructure/config/env.schema.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Authorization endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let issuer: string;
  const realmName = `auth-${Date.now()}`;
  const authPath = `/realms/${realmName}/protocol/openid-connect/auth`;
  const redirectUri = 'https://app.example.com/callback';
  const password = 'a-long-enough-password';

  const query = (overrides: Record<string, string> = {}) =>
    new URLSearchParams({
      response_type: 'code',
      client_id: 'web',
      redirect_uri: redirectUri,
      scope: 'openid email',
      state: 'state-1',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      code_challenge_method: 'S256',
      nonce: 'nonce-1',
      ...overrides,
    }).toString();

  const http = () => request(app.getHttpServer());

  function setCookies(response: Response): string[] {
    const header = response.headers['set-cookie'] as unknown;
    return Array.isArray(header) ? (header as string[]) : [];
  }

  function cookie(response: Response, name: string): string | undefined {
    return setCookies(response).find((value) => value.startsWith(`${name}=`));
  }

  function cookiePair(setCookie: string | undefined): string {
    return setCookie!.split(';')[0];
  }

  async function openLoginPage(params = query()) {
    const response = await http().get(`${authPath}?${params}`).expect(200);
    const csrfCookie = cookie(response, 'GATEHOUSE_LOGIN_CSRF');
    const csrfToken = /name="csrf_token" value="([^"]+)"/.exec(
      response.text,
    )?.[1];
    return { response, csrfCookie, csrfToken: csrfToken! };
  }

  async function signIn(identifier: string, secret: string, status: number) {
    const { csrfCookie, csrfToken } = await openLoginPage();
    return http()
      .post(`${authPath}?${query()}`)
      .set('Cookie', cookiePair(csrfCookie))
      .type('form')
      .send({ csrf_token: csrfToken, identifier, password: secret })
      .expect(status);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    issuer = `${app
      .get<ConfigService<Env, true>>(ConfigService)
      .get('GATEHOUSE_ISSUER', { infer: true })}/realms/${realmName}`;

    await prisma.realm.create({
      data: { name: realmName, displayName: 'Auth Shop' },
    });
    await app.get(CreateClientUseCase).execute({
      realmName,
      clientId: 'web',
      name: 'Web',
      type: ClientType.PUBLIC,
      redirectUris: [redirectUri],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });
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

  it('shows an error page and never redirects to an unregistered URI', async () => {
    const response = await http()
      .get(
        `${authPath}?${query({ redirect_uri: 'https://evil.example.com/cb' })}`,
      )
      .expect(400)
      .expect('Content-Type', /text\/html/);

    expect(response.headers.location).toBeUndefined();
    expect(response.text).toContain('is not registered');
  });

  it('returns protocol errors to the client with the state and the issuer', async () => {
    const response = await http()
      .get(`${authPath}?${query({ code_challenge_method: 'plain' })}`)
      .expect(302);

    const location = new URL(response.headers.location as string);
    expect(`${location.origin}${location.pathname}`).toBe(redirectUri);
    expect(Object.fromEntries(location.searchParams)).toEqual({
      error: 'invalid_request',
      error_description: 'code_challenge_method must be S256',
      state: 'state-1',
      iss: issuer,
    });
  });

  it('serves the login page with protective headers and a CSRF cookie', async () => {
    const { response, csrfCookie, csrfToken } = await openLoginPage();

    expect(response.text).toContain('Auth Shop');
    expect(response.headers).toMatchObject({
      'cache-control': 'no-store',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
    });
    expect(response.headers['content-security-policy']).toContain(
      "frame-ancestors 'none'",
    );
    expect(csrfCookie).toContain(
      `Path=/realms/${realmName}/protocol/openid-connect`,
    );
    expect(csrfCookie).toMatch(/HttpOnly/);
    expect(csrfCookie).toMatch(/SameSite=Strict/);
    expect(csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('sends a form without a valid CSRF token back to a fresh login page', async () => {
    const response = await http()
      .post(`${authPath}?${query()}`)
      .type('form')
      .send({ csrf_token: 'forged', identifier: 'ana', password })
      .expect(303);

    expect(response.headers.location).toBe(`${authPath}?${query()}`);
    expect(cookie(response, 'GATEHOUSE_SESSION')).toBeUndefined();
  });

  it('shows the login page again after a wrong password, keeping the identifier', async () => {
    const response = await signIn('ana', 'wrong-password', 200);

    expect(response.text).toContain('Those credentials did not work');
    expect(response.text).toContain('value="ana"');
    expect(cookie(response, 'GATEHOUSE_SESSION')).toBeUndefined();
  });

  it('signs in, starts a session and redirects with a single-use code', async () => {
    const response = await signIn('ana@shop.example', password, 303);

    const location = new URL(response.headers.location as string);
    const code = location.searchParams.get('code')!;
    expect(`${location.origin}${location.pathname}`).toBe(redirectUri);
    expect(location.searchParams.get('state')).toBe('state-1');
    expect(location.searchParams.get('iss')).toBe(issuer);
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const sessionCookie = cookie(response, 'GATEHOUSE_SESSION');
    expect(sessionCookie).toContain(`Path=/realms/${realmName}`);
    expect(sessionCookie).toMatch(/HttpOnly/);
    expect(sessionCookie).toMatch(/SameSite=Lax/);

    const stored = await prisma.authorizationCode.findMany({
      where: { client: { clientId: 'web', realm: { name: realmName } } },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      redirectUri,
      scope: 'openid email',
      nonce: 'nonce-1',
      consumedAt: null,
    });
    expect(stored[0].codeHash).not.toContain(code);
    const lifespan =
      stored[0].expiresAt.getTime() - stored[0].createdAt.getTime();
    expect(lifespan).toBeGreaterThan(59_000);
    expect(lifespan).toBeLessThanOrEqual(60_000);
  });

  it('skips the login page while the session is valid', async () => {
    const signedIn = await signIn('ana', password, 303);
    const sessionCookie = cookiePair(cookie(signedIn, 'GATEHOUSE_SESSION'));

    const response = await http()
      .get(`${authPath}?${query({ state: 'state-2' })}`)
      .set('Cookie', sessionCookie)
      .expect(302);

    const location = new URL(response.headers.location as string);
    expect(location.searchParams.get('code')).toBeTruthy();
    expect(location.searchParams.get('state')).toBe('state-2');
  });

  it('asks for a login again once the user is disabled', async () => {
    const signedIn = await signIn('ana', password, 303);
    const sessionCookie = cookiePair(cookie(signedIn, 'GATEHOUSE_SESSION'));
    await prisma.user.updateMany({
      where: { username: 'ana', realm: { name: realmName } },
      data: { enabled: false },
    });

    try {
      await http()
        .get(`${authPath}?${query()}`)
        .set('Cookie', sessionCookie)
        .expect(200)
        .expect(({ text }) => expect(text).toContain('name="password"'));
    } finally {
      await prisma.user.updateMany({
        where: { username: 'ana', realm: { name: realmName } },
        data: { enabled: true },
      });
    }
  });

  it('ignores a malformed cookie header', () => {
    return http()
      .get(`${authPath}?${query()}`)
      .set('Cookie', 'GATEHOUSE_SESSION=%E0%A4%A')
      .expect(200);
  });
});
