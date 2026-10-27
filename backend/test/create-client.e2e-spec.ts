import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ClientType } from '../src/modules/clients/domain/client-type.js';
import { ClientAlreadyExistsError } from '../src/modules/clients/domain/errors/client-already-exists.error.js';
import { InvalidClientConfigurationError } from '../src/modules/clients/domain/errors/invalid-client-configuration.error.js';
import { GrantType } from '../src/modules/clients/domain/grant-type.js';
import { ClientRepository } from '../src/modules/clients/domain/repositories/client.repository.js';
import { ClientSecretHasher } from '../src/shared/application/crypto/client-secret-hasher.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('CreateClientUseCase (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createClient: CreateClientUseCase;
  const suffix = Date.now();
  const shop = `shop-${suffix}`;
  const other = `other-${suffix}`;

  const web = {
    realmName: shop,
    clientId: 'web',
    name: 'Web',
    type: ClientType.PUBLIC,
    redirectUris: [
      'https://app.example.com/callback',
      'http://localhost:3000/callback',
    ],
    grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    createClient = app.get(CreateClientUseCase);

    await prisma.realm.createMany({
      data: [
        { name: shop, displayName: 'Shop' },
        { name: other, displayName: 'Other' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: { in: [shop, other] } } });
    await app.close();
  });

  it('persists a public client and reads it back by client id', async () => {
    const { client } = await createClient.execute(web);

    const found = await app
      .get(ClientRepository)
      .findByClientId(client.realmId, 'web');
    expect(found).toMatchObject({
      id: client.id,
      type: ClientType.PUBLIC,
      secretHash: null,
      redirectUris: web.redirectUris,
      grantTypes: web.grantTypes,
      enabled: true,
    });
  });

  it('stores only the hash of a confidential client secret', async () => {
    const { client, secret } = await createClient.execute({
      realmName: shop,
      clientId: 'billing',
      name: 'Billing',
      type: ClientType.CONFIDENTIAL,
      redirectUris: [],
      grantTypes: [GrantType.CLIENT_CREDENTIALS],
    });

    const row = await prisma.client.findUniqueOrThrow({
      where: { id: client.id },
    });
    expect(row.secretHash).not.toContain(secret!);
    expect(app.get(ClientSecretHasher).verify(row.secretHash!, secret!)).toBe(
      true,
    );
  });

  it('rejects the same client id in the same realm', async () => {
    await expect(createClient.execute(web)).rejects.toBeInstanceOf(
      ClientAlreadyExistsError,
    );
  });

  it('allows the same client id in another realm', async () => {
    await expect(
      createClient.execute({ ...web, realmName: other }),
    ).resolves.toMatchObject({ client: { clientId: 'web' } });
  });

  it('does not persist an invalid client', async () => {
    await expect(
      createClient.execute({
        ...web,
        clientId: 'broken',
        redirectUris: ['http://app.example.com/callback'],
      }),
    ).rejects.toBeInstanceOf(InvalidClientConfigurationError);
    await expect(
      prisma.client.count({ where: { clientId: 'broken' } }),
    ).resolves.toBe(0);
  });

  it('returns null for an unknown client id', async () => {
    const realm = await prisma.realm.findUniqueOrThrow({
      where: { name: shop },
    });

    await expect(
      app.get(ClientRepository).findByClientId(realm.id, 'missing'),
    ).resolves.toBeNull();
  });
});
