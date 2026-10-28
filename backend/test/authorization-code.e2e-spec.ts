import { createHash, randomBytes } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createLocalJWKSet, jwtVerify } from 'jose';
import request, { Response } from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import type { Env } from '../src/shared/infrastructure/config/env.schema.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

interface Pkce {
  verifier: string;
  challenge: string;
}

const pkce = (): Pkce => {
  const verifier = randomBytes(32).toString('base64url');
  return {
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
  };
};

describe('authorization_code grant (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let config: ConfigService<Env, true>;
  let issuer: string;
  const suffix = Date.now();
  const consoleId = `console-${suffix}`;
  const portalId = `portal-${suffix}`;
  const consoleRedirect = 'https://console.example.com/callback';
  const portalRedirect = 'https://portal.example.com/callback';
  const authPath = '/realms/master/protocol/openid-connect/auth';
  const tokenPath = '/realms/master/protocol/openid-connect/token';
  let portalSecret: string;

  const http = () => request(app.getHttpServer());

  function setCookie(response: Response, name: string): string | undefined {
    const header = response.headers['set-cookie'] as unknown;
    const cookies = Array.isArray(header) ? (header as string[]) : [];
    return cookies.find((value) => value.startsWith(`${name}=`))?.split(';')[0];
  }

  async function login(
    clientId: string,
    redirectUri: string,
    challenge: Pkce,
  ): Promise<{ code: string; sessionCookie: string }> {
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state: 'state-1',
      nonce: 'nonce-1',
      code_challenge: challenge.challenge,
      code_challenge_method: 'S256',
    }).toString();
    const page = await http().get(`${authPath}?${query}`).expect(200);
    const csrfToken = /name="csrf_token" value="([^"]+)"/.exec(page.text)![1];

    const signedIn = await http()
      .post(`${authPath}?${query}`)
      .set('Cookie', setCookie(page, 'GATEHOUSE_LOGIN_CSRF')!)
      .type('form')
      .send({
        csrf_token: csrfToken,
        identifier: config.get('GATEHOUSE_ADMIN_USERNAME', { infer: true }),
        password: config.get('GATEHOUSE_ADMIN_PASSWORD', { infer: true }),
      })
      .expect(303);

    const location = new URL(signedIn.headers.location as string);
    return {
      code: location.searchParams.get('code')!,
      sessionCookie: setCookie(signedIn, 'GATEHOUSE_SESSION')!,
    };
  }

  const exchange = (fields: Record<string, string>, secret?: string) => {
    const call = http().post(tokenPath).type('form');
    if (secret) {
      call.auth(fields.client_id, secret);
    }
    return call.send({ grant_type: 'authorization_code', ...fields });
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    config = app.get(ConfigService);
    issuer = `${config.get('GATEHOUSE_ISSUER', { infer: true })}/realms/master`;

    const createClient = app.get(CreateClientUseCase);
    await createClient.execute({
      realmName: 'master',
      clientId: consoleId,
      name: 'Console',
      type: ClientType.PUBLIC,
      redirectUris: [consoleRedirect],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });
    const portal = await createClient.execute({
      realmName: 'master',
      clientId: portalId,
      name: 'Portal',
      type: ClientType.CONFIDENTIAL,
      redirectUris: [portalRedirect],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });
    portalSecret = portal.secret!;
  });

  afterAll(async () => {
    await prisma.client.deleteMany({
      where: { clientId: { in: [consoleId, portalId] } },
    });
    await app.close();
  });

  it('exchanges the code of a public client for verifiable access and id tokens', async () => {
    const challenge = pkce();
    const { code } = await login(consoleId, consoleRedirect, challenge);

    const { body } = await exchange({
      client_id: consoleId,
      code,
      redirect_uri: consoleRedirect,
      code_verifier: challenge.verifier,
    })
      .expect(200)
      .expect('Cache-Control', 'no-store');

    expect(body).toEqual({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 300,
      id_token: expect.any(String),
      scope: 'openid profile email',
    });

    const { body: jwks } = await http()
      .get('/realms/master/protocol/openid-connect/certs')
      .expect(200);
    const keys = createLocalJWKSet(jwks);
    const admin = await prisma.user.findFirstOrThrow({
      where: {
        realm: { name: 'master' },
        username: config.get('GATEHOUSE_ADMIN_USERNAME', { infer: true }),
      },
    });

    const access = await jwtVerify(body.access_token, keys, {
      issuer,
      audience: issuer,
      typ: 'at+jwt',
      algorithms: ['ES256'],
    });
    expect(access.payload).toMatchObject({
      sub: admin.id,
      client_id: consoleId,
      scope: 'openid profile email',
      sid: expect.any(String),
    });

    const id = await jwtVerify(body.id_token, keys, {
      issuer,
      audience: consoleId,
      typ: 'JWT',
      algorithms: ['ES256'],
    });
    expect(id.payload).toMatchObject({
      sub: admin.id,
      azp: consoleId,
      nonce: 'nonce-1',
      sid: access.payload.sid,
      auth_time: expect.any(Number),
      preferred_username: admin.username,
      email: admin.email,
      email_verified: admin.emailVerified,
    });
  });

  it('gives the master admin a token that administers the realms', async () => {
    const challenge = pkce();
    const { code } = await login(consoleId, consoleRedirect, challenge);
    const { body } = await exchange({
      client_id: consoleId,
      code,
      redirect_uri: consoleRedirect,
      code_verifier: challenge.verifier,
    }).expect(200);

    await http()
      .get('/admin/realms')
      .auth(body.access_token, { type: 'bearer' })
      .expect(200);
    await http()
      .get('/admin/realms')
      .auth(body.id_token, { type: 'bearer' })
      .expect(401);
  });

  it('refuses a reused code and ends the session that produced it', async () => {
    const challenge = pkce();
    const { code, sessionCookie } = await login(
      consoleId,
      consoleRedirect,
      challenge,
    );
    const fields = {
      client_id: consoleId,
      code,
      redirect_uri: consoleRedirect,
      code_verifier: challenge.verifier,
    };
    await exchange(fields).expect(200);

    const { body } = await exchange(fields).expect(400);

    expect(body.error).toBe('invalid_grant');
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: consoleId,
      redirect_uri: consoleRedirect,
      code_challenge: pkce().challenge,
      code_challenge_method: 'S256',
    }).toString();
    await http()
      .get(`${authPath}?${query}`)
      .set('Cookie', sessionCookie)
      .expect(200)
      .expect(({ text }) => expect(text).toContain('name="password"'));
  });

  it('burns the code when the PKCE verifier is wrong', async () => {
    const challenge = pkce();
    const { code } = await login(consoleId, consoleRedirect, challenge);
    const fields = {
      client_id: consoleId,
      code,
      redirect_uri: consoleRedirect,
    };

    await exchange({ ...fields, code_verifier: pkce().verifier })
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid_grant'));
    await exchange({ ...fields, code_verifier: challenge.verifier })
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid_grant'));
  });

  it('refuses a redirect_uri other than the one of the authorization request', async () => {
    const challenge = pkce();
    const { code } = await login(consoleId, consoleRedirect, challenge);

    await exchange({
      client_id: consoleId,
      code,
      redirect_uri: `${consoleRedirect}/other`,
      code_verifier: challenge.verifier,
    })
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid_grant'));
  });

  it('refuses the code of one client presented by another', async () => {
    const challenge = pkce();
    const { code } = await login(consoleId, consoleRedirect, challenge);

    await exchange(
      {
        client_id: portalId,
        code,
        redirect_uri: consoleRedirect,
        code_verifier: challenge.verifier,
      },
      portalSecret,
    )
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid_grant'));
  });

  it('requires a confidential client to authenticate', async () => {
    const challenge = pkce();
    const { code } = await login(portalId, portalRedirect, challenge);
    const fields = {
      client_id: portalId,
      code,
      redirect_uri: portalRedirect,
      code_verifier: challenge.verifier,
    };

    await exchange(fields)
      .expect(401)
      .expect(({ body }) => expect(body.error).toBe('invalid_client'));
    await exchange(fields, portalSecret).expect(200);
  });

  it('requires the PKCE verifier', async () => {
    const challenge = pkce();
    const { code } = await login(consoleId, consoleRedirect, challenge);

    await exchange({
      client_id: consoleId,
      code,
      redirect_uri: consoleRedirect,
    })
      .expect(400)
      .expect(({ body }) => expect(body.error).toBe('invalid_request'));
  });
});
