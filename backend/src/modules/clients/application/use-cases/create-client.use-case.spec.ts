import { FakeSecretHasher } from '../../../../shared/testing/fake-secret-hasher.js';
import { SequentialSecretGenerator } from '../../../../shared/testing/sequential-secret-generator.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { ClientType } from '../../domain/client-type.js';
import { InvalidClientConfigurationError } from '../../domain/errors/invalid-client-configuration.error.js';
import { GrantType } from '../../domain/grant-type.js';
import { InMemoryClientRepository } from '../../testing/in-memory-client.repository.js';
import { CreateClientUseCase } from './create-client.use-case.js';

describe('CreateClientUseCase', () => {
  let clients: InMemoryClientRepository;
  let secrets: SequentialSecretGenerator;
  let useCase: CreateClientUseCase;

  beforeEach(() => {
    clients = new InMemoryClientRepository();
    secrets = new SequentialSecretGenerator();
    useCase = new CreateClientUseCase(
      new InMemoryRealmRepository([aRealm()]),
      clients,
      secrets,
      new FakeSecretHasher(),
    );
  });

  const web = {
    realmName: 'shop',
    clientId: 'web',
    name: 'Web',
    type: ClientType.PUBLIC,
    redirectUris: ['https://app.example.com/callback'],
    grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
  };

  const billing = {
    realmName: 'shop',
    clientId: 'billing',
    name: 'Billing',
    type: ClientType.CONFIDENTIAL,
    redirectUris: [],
    grantTypes: [GrantType.CLIENT_CREDENTIALS],
  };

  it('creates a public client without generating a secret', async () => {
    const { client, secret } = await useCase.execute(web);

    expect(secret).toBeNull();
    expect(secrets.generate).not.toHaveBeenCalled();
    expect(client).toMatchObject({
      realmId: 'shop-id',
      clientId: 'web',
      type: ClientType.PUBLIC,
      secretHash: null,
    });
  });

  it('creates a confidential client and returns the plain secret only once', async () => {
    const { client, secret } = await useCase.execute(billing);

    expect(secret).toBe('secret-1');
    expect(client.secretHash).toBe('hashed:secret-1');
  });

  it('fails for an unknown realm', async () => {
    await expect(
      useCase.execute({ ...web, realmName: 'missing' }),
    ).rejects.toBeInstanceOf(RealmNotFoundError);
  });

  it('rejects an invalid configuration before persisting it', async () => {
    await expect(
      useCase.execute({
        ...web,
        grantTypes: [GrantType.CLIENT_CREDENTIALS],
      }),
    ).rejects.toBeInstanceOf(InvalidClientConfigurationError);
    expect(clients.clients).toHaveLength(0);
  });

  it.each([
    ['a client id with a space', { clientId: 'my web' }],
    ['a blank name', { name: '   ' }],
  ])('rejects %s before persisting it', async (_case, overrides) => {
    await expect(
      useCase.execute({ ...web, ...overrides }),
    ).rejects.toBeInstanceOf(InvalidClientConfigurationError);
    expect(clients.clients).toHaveLength(0);
  });

  it('stores the name without surrounding spaces', async () => {
    const { client } = await useCase.execute({ ...web, name: '  Web  ' });

    expect(client.name).toBe('Web');
  });
});
