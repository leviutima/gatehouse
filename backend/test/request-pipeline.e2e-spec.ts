import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { z } from 'zod';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import type { Principal } from '../src/shared/application/auth/principal.js';
import { DomainError } from '../src/shared/domain/errors/domain-error.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';
import { CurrentUser } from '../src/shared/presentation/decorators/current-user.decorator.js';
import { Public } from '../src/shared/presentation/decorators/public.decorator.js';
import { ZodValidationPipe } from '../src/shared/presentation/pipes/zod-validation.pipe.js';

class ProbeConflictError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'probe_conflict';
}

const echoSchema = z.object({ name: z.string().min(1) });

@Controller('probe')
class ProbeController {
  @Public()
  @Get('public')
  open() {
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: Principal) {
    return user;
  }

  @Public()
  @Post('echo')
  echo(
    @Body(new ZodValidationPipe(echoSchema)) body: z.infer<typeof echoSchema>,
  ) {
    return body;
  }

  @Public()
  @Get('conflict')
  conflict() {
    throw new ProbeConflictError('probe already exists');
  }
}

describe('Request pipeline (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let probeClientId: string;
  const realmName = `pipeline-${Date.now()}`;

  const setRealmEnabled = (enabled: boolean) =>
    prisma.realm.update({ where: { name: realmName }, data: { enabled } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.realm.create({
      data: { name: realmName, displayName: 'Pipeline' },
    });
    const { client, secret } = await app.get(CreateClientUseCase).execute({
      realmName,
      clientId: 'probe',
      name: 'Probe',
      type: ClientType.CONFIDENTIAL,
      redirectUris: [],
      grantTypes: [GrantType.CLIENT_CREDENTIALS],
    });
    probeClientId = client.id;

    const { body } = await request(app.getHttpServer())
      .post(`/realms/${realmName}/protocol/openid-connect/token`)
      .type('form')
      .auth('probe', secret!)
      .send({ grant_type: 'client_credentials' })
      .expect(200);
    accessToken = body.access_token;
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: realmName } });
    await app.close();
  });

  it('serves @Public() routes without a token', () => {
    return request(app.getHttpServer())
      .get('/probe/public')
      .expect(200, { ok: true });
  });

  it('injects the principal of a realm access token with @CurrentUser()', () => {
    return request(app.getHttpServer())
      .get('/probe/me')
      .auth(accessToken, { type: 'bearer' })
      .expect(200, {
        subject: probeClientId,
        realm: realmName,
        clientId: 'probe',
        scopes: [],
      });
  });

  it('denies protected routes without a token', () => {
    return request(app.getHttpServer())
      .get('/probe/me')
      .expect(401)
      .expect('WWW-Authenticate', 'Bearer')
      .expect((response) => {
        expect(response.body).toEqual({
          statusCode: 401,
          error: 'unauthorized',
          message: 'Missing bearer token',
        });
      });
  });

  it('denies a token Gatehouse did not issue', () => {
    return request(app.getHttpServer())
      .get('/probe/me')
      .auth('anything', { type: 'bearer' })
      .expect(401)
      .expect('WWW-Authenticate', 'Bearer error="invalid_token"');
  });

  it('denies an access token whose claims were changed', () => {
    const [header, payload, signature] = accessToken.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const forged = Buffer.from(
      JSON.stringify({ ...claims, client_id: 'admin-console' }),
    ).toString('base64url');

    return request(app.getHttpServer())
      .get('/probe/me')
      .auth(`${header}.${forged}.${signature}`, { type: 'bearer' })
      .expect(401)
      .expect('WWW-Authenticate', 'Bearer error="invalid_token"');
  });

  it('denies the access token once its realm is disabled', async () => {
    await setRealmEnabled(false);

    try {
      await request(app.getHttpServer())
        .get('/probe/me')
        .auth(accessToken, { type: 'bearer' })
        .expect(401);
    } finally {
      await setRealmEnabled(true);
    }
  });

  it('rejects an invalid body with 400 and the failing fields', () => {
    return request(app.getHttpServer())
      .post('/probe/echo')
      .send({ name: '' })
      .expect(400)
      .expect((response) => {
        expect(response.body.error).toBe('validation_failed');
        expect(response.body.issues[0].path).toBe('name');
      });
  });

  it('returns the validated body', () => {
    return request(app.getHttpServer())
      .post('/probe/echo')
      .send({ name: 'gatehouse', extra: true })
      .expect(201, { name: 'gatehouse' });
  });

  it('turns a domain error into its HTTP status', () => {
    return request(app.getHttpServer()).get('/probe/conflict').expect(409, {
      statusCode: 409,
      error: 'probe_conflict',
      message: 'probe already exists',
    });
  });
});
