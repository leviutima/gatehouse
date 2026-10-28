import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import { CreateUserUseCase } from '../src/modules/users/application/use-cases/create-user.use-case.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';
import { signInThroughBrowser } from './support/browser-login.js';

describe('UserInfo endpoint (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let anaId: string;
  let serviceSecret: string;
  const realmName = `userinfo-${Date.now()}`;
  const base = `/realms/${realmName}/protocol/openid-connect`;
  const redirectUri = 'https://app.example.com/callback';
  const password = 'a-long-enough-password';

  const http = () => request(app.getHttpServer());

  async function userToken(scope: string): Promise<string> {
    const login = await signInThroughBrowser(app, {
      realm: realmName,
      clientId: 'app',
      redirectUri,
      identifier: 'ana',
      password,
      scope,
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
    return body.access_token as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.realm.create({
      data: { name: realmName, displayName: 'UserInfo Shop' },
    });
    const createClient = app.get(CreateClientUseCase);
    await createClient.execute({
      realmName,
      clientId: 'app',
      name: 'App',
      type: ClientType.PUBLIC,
      redirectUris: [redirectUri],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });
    const service = await createClient.execute({
      realmName,
      clientId: 'service',
      name: 'Service',
      type: ClientType.CONFIDENTIAL,
      redirectUris: [],
      grantTypes: [GrantType.CLIENT_CREDENTIALS],
    });
    serviceSecret = service.secret!;
    anaId = (
      await app.get(CreateUserUseCase).execute({
        realmName,
        username: 'ana',
        email: 'ana@shop.example',
        password,
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: realmName } });
    await app.close();
  });

  it('returns the claims allowed by the scopes of the token', async () => {
    const token = await userToken('openid profile email');

    await http()
      .get(`${base}/userinfo`)
      .auth(token, { type: 'bearer' })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({
        sub: anaId,
        preferred_username: 'ana',
        email: 'ana@shop.example',
        email_verified: false,
      });
  });

  it('leaves out the claims of scopes that were not granted', async () => {
    const token = await userToken('openid');

    await http()
      .post(`${base}/userinfo`)
      .auth(token, { type: 'bearer' })
      .expect(200)
      .expect({ sub: anaId });
  });

  it('requires the openid scope', async () => {
    const token = await userToken('email');

    await http()
      .get(`${base}/userinfo`)
      .auth(token, { type: 'bearer' })
      .expect(403)
      .expect('WWW-Authenticate', 'Bearer error="insufficient_scope"');
  });

  it('refuses a token with no user behind it', async () => {
    const { body } = await http()
      .post(`${base}/token`)
      .type('form')
      .auth('service', serviceSecret)
      .send({ grant_type: 'client_credentials' })
      .expect(200);

    await http()
      .get(`${base}/userinfo`)
      .auth(body.access_token, { type: 'bearer' })
      .expect(403)
      .expect('WWW-Authenticate', 'Bearer error="insufficient_scope"');
  });

  it('refuses a token of another realm', async () => {
    const token = await userToken('openid');

    await http()
      .get('/realms/master/protocol/openid-connect/userinfo')
      .auth(token, { type: 'bearer' })
      .expect(401)
      .expect('WWW-Authenticate', 'Bearer error="invalid_token"');
  });

  it('stops answering once the user is disabled', async () => {
    const token = await userToken('openid');
    await prisma.user.update({
      where: { id: anaId },
      data: { enabled: false },
    });

    try {
      await http()
        .get(`${base}/userinfo`)
        .auth(token, { type: 'bearer' })
        .expect(401)
        .expect('WWW-Authenticate', 'Bearer error="invalid_token"');
    } finally {
      await prisma.user.update({
        where: { id: anaId },
        data: { enabled: true },
      });
    }
  });

  it('requires a bearer token', () => {
    return http().get(`${base}/userinfo`).expect(401);
  });
});
