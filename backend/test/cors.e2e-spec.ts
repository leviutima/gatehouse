import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Browser origins (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const realmName = `cors-${suffix}`;
  const consoleClientId = `cors-console-${suffix}`;
  const appOrigin = 'https://app.example.com';
  const consoleOrigin = 'https://console.example.com';
  const tokenPath = `/realms/${realmName}/protocol/openid-connect/token`;

  const http = () => request(app.getHttpServer());

  const preflight = (path: string, origin: string) =>
    http()
      .options(path)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization, content-type');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.realm.create({
      data: { name: realmName, displayName: 'CORS' },
    });
    const createClient = app.get(CreateClientUseCase);
    await createClient.execute({
      realmName,
      clientId: 'spa',
      name: 'SPA',
      type: ClientType.PUBLIC,
      redirectUris: [`${appOrigin}/callback`],
      webOrigins: [appOrigin],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });
    await createClient.execute({
      realmName: 'master',
      clientId: consoleClientId,
      name: 'Console',
      type: ClientType.PUBLIC,
      redirectUris: [`${consoleOrigin}/callback`],
      webOrigins: [consoleOrigin],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: realmName } });
    await prisma.client.deleteMany({ where: { clientId: consoleClientId } });
    await app.close();
  });

  it('answers the preflight of a registered origin', async () => {
    const response = await preflight(tokenPath, appOrigin).expect(204);

    expect(response.headers).toMatchObject({
      'access-control-allow-origin': appOrigin,
      'access-control-allow-headers': 'Authorization, Content-Type',
      'access-control-max-age': '600',
    });
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers.vary).toContain('Origin');
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
  });

  it('gives an unregistered origin no permission', async () => {
    const response = await preflight(
      tokenPath,
      'https://evil.example.com',
    ).expect(204);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('lets a registered origin read even an error response', async () => {
    const response = await http()
      .post(tokenPath)
      .set('Origin', appOrigin)
      .type('form')
      .send({ grant_type: 'password' });

    expect(response.status).toBe(400);
    expect(response.headers['access-control-allow-origin']).toBe(appOrigin);
    expect(response.headers['access-control-expose-headers']).toBe(
      'WWW-Authenticate',
    );
  });

  it('keeps the origins of one realm out of another', async () => {
    const response = await preflight(
      '/realms/master/protocol/openid-connect/token',
      appOrigin,
    ).expect(204);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('opens the admin API to the origins of master clients', async () => {
    const response = await preflight('/admin/realms', consoleOrigin).expect(
      204,
    );

    expect(response.headers['access-control-allow-origin']).toBe(consoleOrigin);
  });

  it('opens the admin routes of a realm to the origins of that realm', async () => {
    const own = await preflight(
      `/admin/realms/${realmName}/users`,
      appOrigin,
    ).expect(204);
    const global = await preflight('/admin/realms', appOrigin).expect(204);

    expect(own.headers['access-control-allow-origin']).toBe(appOrigin);
    expect(global.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('leaves the browser login out of CORS', async () => {
    const response = await http()
      .get(`/realms/${realmName}/protocol/openid-connect/auth`)
      .set('Origin', appOrigin);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
