import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { z } from 'zod';
import { AppModule } from '../src/app.module.js';
import type { Principal } from '../src/shared/application/auth/principal.js';
import { TokenVerifier } from '../src/shared/application/auth/token-verifier.js';
import { DomainError } from '../src/shared/domain/errors/domain-error.js';
import { CurrentUser } from '../src/shared/presentation/decorators/current-user.decorator.js';
import { Public } from '../src/shared/presentation/decorators/public.decorator.js';
import { ZodValidationPipe } from '../src/shared/presentation/pipes/zod-validation.pipe.js';

const principal: Principal = {
  subject: 'user-1',
  realm: 'master',
  clientId: 'admin-console',
  scopes: ['openid'],
};

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

async function createApp(verifier?: TokenVerifier) {
  let builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProbeController],
  });
  if (verifier) {
    builder = builder.overrideProvider(TokenVerifier).useValue(verifier);
  }
  const app = (await builder.compile()).createNestApplication<
    INestApplication<App>
  >();
  await app.init();
  return app;
}

describe('Request pipeline (e2e)', () => {
  describe('with the default verifier', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('serves @Public() routes without a token', () => {
      return request(app.getHttpServer())
        .get('/probe/public')
        .expect(200, { ok: true });
    });

    it('denies protected routes even with a token until keys exist', () => {
      return request(app.getHttpServer())
        .get('/probe/me')
        .set('Authorization', 'Bearer anything')
        .expect(401)
        .expect('WWW-Authenticate', 'Bearer error="invalid_token"');
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

  describe('with a verifier that accepts a token', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createApp({
        verify: (token: string) =>
          Promise.resolve(token === 'valid-token' ? principal : null),
      });
    });

    afterAll(async () => {
      await app.close();
    });

    it('injects the principal with @CurrentUser()', () => {
      return request(app.getHttpServer())
        .get('/probe/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200, principal);
    });
  });
});
