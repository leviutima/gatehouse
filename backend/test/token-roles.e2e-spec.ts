import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { decodeJwt } from 'jose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AssignUserRoleUseCase } from '../src/modules/admin/application/use-cases/assign-user-role.use-case.js';
import { CreateRoleUseCase } from '../src/modules/admin/application/use-cases/create-role.use-case.js';
import { UnassignUserRoleUseCase } from '../src/modules/admin/application/use-cases/unassign-user-role.use-case.js';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import { CreateUserUseCase } from '../src/modules/users/application/use-cases/create-user.use-case.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';
import { signInThroughBrowser } from './support/browser-login.js';

interface TokenBody {
  access_token: string;
  id_token: string;
  refresh_token: string;
}

describe('roles in tokens (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const realmName = `token-roles-${Date.now()}`;
  const tokenPath = `/realms/${realmName}/protocol/openid-connect/token`;
  const redirectUri = 'https://app.example.com/callback';
  const password = 'a-long-enough-password';
  let anaId: string;
  let serviceSecret: string;

  const http = () => request(app.getHttpServer());

  async function tokensFor(clientId: string): Promise<TokenBody> {
    const login = await signInThroughBrowser(app, {
      realm: realmName,
      clientId,
      redirectUri,
      identifier: 'ana',
      password,
    });
    const { body } = await http()
      .post(tokenPath)
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: clientId,
        code: login.code,
        redirect_uri: redirectUri,
        code_verifier: login.pkce.verifier,
      })
      .expect(200);
    return body as TokenBody;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.realm.create({
      data: { name: realmName, displayName: 'Token Roles Shop' },
    });
    const createClient = app.get(CreateClientUseCase);
    for (const clientId of ['web', 'orders']) {
      await createClient.execute({
        realmName,
        clientId,
        name: clientId,
        type: ClientType.PUBLIC,
        redirectUris: [redirectUri],
        grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
      });
    }
    const service = await createClient.execute({
      realmName,
      clientId: 'service',
      name: 'service',
      type: ClientType.CONFIDENTIAL,
      redirectUris: [],
      grantTypes: [GrantType.CLIENT_CREDENTIALS],
    });
    serviceSecret = service.secret!;
    ({ id: anaId } = await app.get(CreateUserUseCase).execute({
      realmName,
      username: 'ana',
      email: 'ana@shop.example',
      password,
    }));

    const createRole = app.get(CreateRoleUseCase);
    const assign = app.get(AssignUserRoleUseCase);
    for (const [clientId, roleName] of [
      [undefined, 'viewer'],
      ['web', 'cart:edit'],
      ['orders', 'orders:ship'],
    ] as const) {
      await createRole.execute({ realmName, clientId, name: roleName });
      await assign.execute({ realmName, clientId, userId: anaId, roleName });
    }
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: realmName } });
    await app.close();
  });

  it('puts the realm roles and only the requesting client roles in the access token', async () => {
    const { access_token } = await tokensFor('web');

    const claims = decodeJwt(access_token);
    expect(claims.realm_access).toEqual({ roles: ['viewer'] });
    expect(claims.resource_access).toEqual({
      web: { roles: ['cart:edit'] },
    });
  });

  it('keeps the roles out of the id token', async () => {
    const { id_token } = await tokensFor('web');

    const claims = decodeJwt(id_token);
    expect(claims).not.toHaveProperty('realm_access');
    expect(claims).not.toHaveProperty('resource_access');
  });

  it('reads the roles again on refresh', async () => {
    const { refresh_token } = await tokensFor('orders');
    await app.get(UnassignUserRoleUseCase).execute({
      realmName,
      clientId: 'orders',
      userId: anaId,
      roleName: 'orders:ship',
    });

    const { body } = await http()
      .post(tokenPath)
      .type('form')
      .send({
        grant_type: 'refresh_token',
        client_id: 'orders',
        refresh_token,
      })
      .expect(200);

    const claims = decodeJwt(body.access_token);
    expect(claims.realm_access).toEqual({ roles: ['viewer'] });
    expect(claims).not.toHaveProperty('resource_access');
  });

  it('gives no roles to a client_credentials token', async () => {
    const { body } = await http()
      .post(tokenPath)
      .type('form')
      .auth('service', serviceSecret)
      .send({ grant_type: 'client_credentials' })
      .expect(200);

    const claims = decodeJwt(body.access_token);
    expect(claims).not.toHaveProperty('realm_access');
    expect(claims).not.toHaveProperty('resource_access');
  });
});
