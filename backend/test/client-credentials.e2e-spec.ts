import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import type { Env } from '../src/shared/infrastructure/config/env.schema.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('client_credentials grant (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let secret: string;
  let billingId: string;
  const realmName = `cc-${Date.now()}`;
  const tokenPath = `/realms/${realmName}/protocol/openid-connect/token`;
  const certsPath = `/realms/${realmName}/protocol/openid-connect/certs`;

  const basic = (clientId: string, clientSecret: string) =>
    `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  const tokenRequest = () =>
    request(app.getHttpServer()).post(tokenPath).type('form');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.realm.create({
      data: { name: realmName, displayName: 'CC', accessTokenLifespan: 120 },
    });
    const createClient = app.get(CreateClientUseCase);
    const billing = await createClient.execute({
      realmName,
      clientId: 'billing',
      name: 'Billing',
      type: ClientType.CONFIDENTIAL,
      redirectUris: [],
      grantTypes: [GrantType.CLIENT_CREDENTIALS],
    });
    secret = billing.secret!;
    billingId = billing.client.id;
    await createClient.execute({
      realmName,
      clientId: 'web',
      name: 'Web',
      type: ClientType.PUBLIC,
      redirectUris: ['https://app.example.com/callback'],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });
    await prisma.client.create({
      data: {
        realmId: billing.client.realmId,
        clientId: 'no-m2m',
        name: 'No M2M',
        type: 'CONFIDENTIAL',
        secretHash: billing.client.secretHash,
        redirectUris: ['https://app.example.com/callback'],
        grantTypes: ['AUTHORIZATION_CODE'],
      },
    });
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: realmName } });
    await app.close();
  });

  it('issues an access token that verifies against the realm JWKS', async () => {
    const response = await tokenRequest()
      .set('Authorization', basic('billing', secret))
      .send({ grant_type: 'client_credentials' })
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect('Pragma', 'no-cache');

    expect(response.body).toEqual({
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 120,
    });

    const issuer = `${app
      .get<ConfigService<Env, true>>(ConfigService)
      .get('GATEHOUSE_ISSUER', { infer: true })}/realms/${realmName}`;
    const { body: jwks } = await request(app.getHttpServer())
      .get(certsPath)
      .expect(200);
    const { payload, protectedHeader } = await jwtVerify(
      response.body.access_token,
      createLocalJWKSet(jwks),
      { issuer, audience: issuer, typ: 'at+jwt', algorithms: ['ES256'] },
    );

    expect(protectedHeader.kid).toBe(jwks.keys[0].kid);
    expect(payload).toMatchObject({
      sub: billingId,
      client_id: 'billing',
      jti: expect.any(String),
    });
    expect(payload.exp! - payload.iat!).toBe(120);
    expect(Math.abs(payload.iat! - Date.now() / 1000)).toBeLessThan(30);
  });

  it('accepts client_secret_post', async () => {
    const response = await tokenRequest()
      .send({
        grant_type: 'client_credentials',
        client_id: 'billing',
        client_secret: secret,
      })
      .expect(200);

    expect(decodeProtectedHeader(response.body.access_token).typ).toBe(
      'at+jwt',
    );
  });

  it.each([
    ['a wrong secret', basic('billing', 'wrong-secret')],
    ['an unknown client', basic('ghost', 'whatever')],
    ['a public client', basic('web', 'whatever')],
  ])('answers invalid_client for %s', async (_case, authorization) => {
    const response = await tokenRequest()
      .set('Authorization', authorization)
      .send({ grant_type: 'client_credentials' })
      .expect(401)
      .expect('WWW-Authenticate', 'Basic realm="gatehouse"')
      .expect('Cache-Control', 'no-store');

    expect(response.body).toEqual({
      error: 'invalid_client',
      error_description: 'Client authentication failed',
    });
  });

  it('answers unauthorized_client when the client lacks the grant', async () => {
    const response = await tokenRequest()
      .set('Authorization', basic('no-m2m', secret))
      .send({ grant_type: 'client_credentials' })
      .expect(400);

    expect(response.body.error).toBe('unauthorized_client');
  });

  it('answers unsupported_grant_type for other grants', async () => {
    const response = await tokenRequest()
      .set('Authorization', basic('billing', secret))
      .send({ grant_type: 'password' })
      .expect(400);

    expect(response.body.error).toBe('unsupported_grant_type');
  });

  it('answers invalid_request when both authentication methods are used', async () => {
    const response = await tokenRequest()
      .set('Authorization', basic('billing', secret))
      .send({ grant_type: 'client_credentials', client_secret: secret })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });

  it('answers invalid_request for a repeated parameter', async () => {
    const response = await tokenRequest()
      .set('Authorization', basic('billing', secret))
      .send('grant_type=client_credentials&grant_type=client_credentials')
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });

  it('answers invalid_request for a JSON body', async () => {
    const response = await request(app.getHttpServer())
      .post(tokenPath)
      .set('Authorization', basic('billing', secret))
      .send({ grant_type: 'client_credentials' })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });

  it('answers 404 for an unknown realm', async () => {
    await request(app.getHttpServer())
      .post(`/realms/missing-${Date.now()}/protocol/openid-connect/token`)
      .type('form')
      .set('Authorization', basic('billing', secret))
      .send({ grant_type: 'client_credentials' })
      .expect(404);
  });

  it('answers 404 for a disabled realm', async () => {
    await prisma.realm.update({
      where: { name: realmName },
      data: { enabled: false },
    });

    try {
      await tokenRequest()
        .set('Authorization', basic('billing', secret))
        .send({ grant_type: 'client_credentials' })
        .expect(404);
    } finally {
      await prisma.realm.update({
        where: { name: realmName },
        data: { enabled: true },
      });
    }
  });
});
