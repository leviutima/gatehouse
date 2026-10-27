import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupSwagger } from '../src/shared/presentation/openapi/setup-swagger.js';

describe('Swagger (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the OpenAPI document without authentication', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);

    expect(body).toMatchObject({
      openapi: expect.stringMatching(/^3\./),
      info: { title: 'Gatehouse' },
    });
  });

  it('documents the JWKS endpoint with its response schema', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);

    const certs = body.paths['/realms/{realm}/protocol/openid-connect/certs'];
    expect(certs.get.tags).toEqual(['OpenID Connect']);
    expect(
      certs.get.responses['200'].content['application/json'].schema,
    ).toMatchObject({
      type: 'object',
      required: ['keys'],
    });
  });

  it('documents the token endpoint as a form with basic client auth', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);

    const token = body.paths['/realms/{realm}/protocol/openid-connect/token'];
    expect(Object.keys(token.post.requestBody.content)).toEqual([
      'application/x-www-form-urlencoded',
    ]);
    expect(token.post.security).toEqual([{ client_secret_basic: [] }]);
    expect(Object.keys(token.post.responses).sort()).toEqual([
      '200',
      '400',
      '401',
      '404',
    ]);
  });

  it('serves the Swagger UI', async () => {
    const response = await request(app.getHttpServer())
      .get('/docs')
      .expect(200);

    expect(response.text).toContain('swagger-ui');
  });
});
