import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Response } from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import { CreateUserUseCase } from '../src/modules/users/application/use-cases/create-user.use-case.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';
import { cookieFrom, signInThroughBrowser } from './support/browser-login.js';

interface SignedIn {
  idToken: string;
  refreshToken: string;
  sessionCookie: string;
}

describe('Logout endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const realmName = `logout-${Date.now()}`;
  const base = `/realms/${realmName}/protocol/openid-connect`;
  const redirectUri = 'https://app.example.com/callback';
  const signedOutUri = 'https://app.example.com/signed-out';
  const password = 'a-long-enough-password';

  const http = () => request(app.getHttpServer());

  async function signIn(): Promise<SignedIn> {
    const login = await signInThroughBrowser(app, {
      realm: realmName,
      clientId: 'app',
      redirectUri,
      identifier: 'ana',
      password,
    });
    const { body } = await http()
      .post(`${base}/token`)
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: 'app',
        code: login.code,
        redirect_uri: redirectUri,
        code_verifier: login.pkce.verifier,
      })
      .expect(200);
    return {
      idToken: body.id_token,
      refreshToken: body.refresh_token,
      sessionCookie: login.sessionCookie,
    };
  }

  const refresh = (refreshToken: string) =>
    http().post(`${base}/token`).type('form').send({
      grant_type: 'refresh_token',
      client_id: 'app',
      refresh_token: refreshToken,
    });

  const logoutUrl = (params: Record<string, string>) =>
    `${base}/logout?${new URLSearchParams(params).toString()}`;

  function sessionCleared(response: Response): boolean {
    const header = response.headers['set-cookie'] as unknown;
    const cookies = Array.isArray(header) ? (header as string[]) : [];
    return cookies.some(
      (cookie) =>
        cookie.startsWith('GATEHOUSE_SESSION=;') &&
        /Expires=Thu, 01 Jan 1970/.test(cookie),
    );
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.realm.create({
      data: { name: realmName, displayName: 'Logout Shop' },
    });
    await app.get(CreateClientUseCase).execute({
      realmName,
      clientId: 'app',
      name: 'App',
      type: ClientType.PUBLIC,
      redirectUris: [redirectUri],
      postLogoutRedirectUris: [signedOutUri],
      grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
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

  it('signs out with an id token hint and returns to the registered URI with the state', async () => {
    const { idToken, refreshToken, sessionCookie } = await signIn();

    const response = await http()
      .get(
        logoutUrl({
          id_token_hint: idToken,
          post_logout_redirect_uri: signedOutUri,
          state: 'bye-1',
        }),
      )
      .set('Cookie', sessionCookie)
      .expect(302);

    expect(response.headers.location).toBe(`${signedOutUri}?state=bye-1`);
    expect(sessionCleared(response)).toBe(true);
    await refresh(refreshToken)
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid_grant'));
  });

  it('ends the session named by the hint even without the browser cookie', async () => {
    const { idToken, refreshToken } = await signIn();

    await http()
      .get(logoutUrl({ id_token_hint: idToken }))
      .expect(200)
      .expect(({ text }) => expect(text).toContain('You are signed out'));

    await refresh(refreshToken).expect(400);
  });

  it('asks for confirmation when there is no hint, and only then signs out', async () => {
    const { refreshToken, sessionCookie } = await signIn();

    const page = await http()
      .get(
        logoutUrl({ client_id: 'app', post_logout_redirect_uri: signedOutUri }),
      )
      .set('Cookie', sessionCookie)
      .expect(200);
    expect(page.text).toContain('Do you want to sign out');
    await refresh(refreshToken).expect(200);

    const csrfToken = /name="csrf_token" value="([^"]+)"/.exec(page.text)![1];
    const csrfCookie = cookieFrom(page, 'GATEHOUSE_LOGIN_CSRF')!;
    const response = await http()
      .post(
        logoutUrl({ client_id: 'app', post_logout_redirect_uri: signedOutUri }),
      )
      .set('Cookie', [sessionCookie, csrfCookie].join('; '))
      .type('form')
      .send({ csrf_token: csrfToken })
      .expect(303);

    expect(response.headers.location).toBe(signedOutUri);
    expect(sessionCleared(response)).toBe(true);
    await http()
      .get(
        `${base}/auth?client_id=app&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256`,
      )
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect(({ text }) => expect(text).toContain('name="password"'));
  });

  it('sends a confirmation without a valid CSRF token back to the form', async () => {
    const { refreshToken, sessionCookie } = await signIn();

    await http()
      .post(logoutUrl({ client_id: 'app' }))
      .set('Cookie', sessionCookie)
      .type('form')
      .send({ csrf_token: 'forged' })
      .expect(303);

    await refresh(refreshToken).expect(200);
  });

  it.each([
    [
      'an unregistered return address',
      {
        client_id: 'app',
        post_logout_redirect_uri: 'https://evil.example.com/',
      },
    ],
    [
      'a return address without a client',
      { post_logout_redirect_uri: signedOutUri },
    ],
    ['an invalid hint', { id_token_hint: 'not-a-jwt' }],
    ['an unknown client', { client_id: 'ghost' }],
  ])('never redirects for %s', async (_case, params) => {
    const response = await http().get(logoutUrl(params)).expect(400);

    expect(response.headers.location).toBeUndefined();
  });

  it('refuses a client_id that differs from the hint', async () => {
    const { idToken, refreshToken } = await signIn();

    await http()
      .get(logoutUrl({ id_token_hint: idToken, client_id: 'other' }))
      .expect(400);
    await refresh(refreshToken).expect(200);
  });
});
