import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import type { Env } from '../src/shared/infrastructure/config/env.schema.js';

describe('OpenID Provider configuration (e2e)', () => {
  let app: INestApplication<App>;
  let issuer: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    issuer = `${app
      .get<ConfigService<Env, true>>(ConfigService)
      .get('GATEHOUSE_ISSUER', { infer: true })}/realms/master`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('describes the realm as an OpenID Provider', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/realms/master/.well-known/openid-configuration')
      .expect(200)
      .expect('Cache-Control', 'public, max-age=300');

    expect(body).toMatchObject({
      issuer,
      authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
      token_endpoint: `${issuer}/protocol/openid-connect/token`,
      userinfo_endpoint: `${issuer}/protocol/openid-connect/userinfo`,
      jwks_uri: `${issuer}/protocol/openid-connect/certs`,
      end_session_endpoint: `${issuer}/protocol/openid-connect/logout`,
      response_types_supported: ['code'],
      code_challenge_methods_supported: ['S256'],
      id_token_signing_alg_values_supported: ['ES256'],
      scopes_supported: ['openid', 'profile', 'email'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'none',
      ],
      authorization_response_iss_parameter_supported: true,
    });
  });

  it('points at endpoints that answer on this server', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/realms/master/.well-known/openid-configuration')
      .expect(200);

    await request(app.getHttpServer())
      .get(new URL(body.jwks_uri as string).pathname)
      .expect(200);
  });

  it('answers 404 for an unknown realm', () => {
    return request(app.getHttpServer())
      .get('/realms/missing-realm/.well-known/openid-configuration')
      .expect(404);
  });
});
