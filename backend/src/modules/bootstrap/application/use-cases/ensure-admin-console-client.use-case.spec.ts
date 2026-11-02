import { ClientType } from '../../../clients/domain/client-type.js';
import { InvalidClientConfigurationError } from '../../../clients/domain/errors/invalid-client-configuration.error.js';
import { GrantType } from '../../../clients/domain/grant-type.js';
import { InMemoryClientRepository } from '../../../clients/testing/in-memory-client.repository.js';
import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import {
  ADMIN_CONSOLE_CLIENT_ID,
  EnsureAdminConsoleClientUseCase,
} from './ensure-admin-console-client.use-case.js';

describe('EnsureAdminConsoleClientUseCase', () => {
  let clients: InMemoryClientRepository;
  let useCase: EnsureAdminConsoleClientUseCase;

  beforeEach(() => {
    clients = new InMemoryClientRepository();
    useCase = new EnsureAdminConsoleClientUseCase(
      new InMemoryRealmRepository([aRealm({ name: 'master' })]),
      clients,
    );
  });

  it('creates a public console client in master from the console URL', async () => {
    await expect(useCase.execute('http://localhost:8080/')).resolves.toBe(
      'created',
    );

    expect(clients.clients).toEqual([
      expect.objectContaining({
        realmId: 'master-id',
        clientId: ADMIN_CONSOLE_CLIENT_ID,
        type: ClientType.PUBLIC,
        secretHash: null,
        redirectUris: ['http://localhost:8080/callback'],
        postLogoutRedirectUris: ['http://localhost:8080/'],
        webOrigins: ['http://localhost:8080'],
        grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
      }),
    ]);
  });

  it('leaves an existing console client untouched', async () => {
    await useCase.execute('http://localhost:8080');

    await expect(useCase.execute('https://console.example.com')).resolves.toBe(
      'already_exists',
    );
    expect(clients.clients).toHaveLength(1);
    expect(clients.clients[0].webOrigins).toEqual(['http://localhost:8080']);
  });

  it('refuses a console URL that breaks the client rules', async () => {
    await expect(
      useCase.execute('http://console.example.com'),
    ).rejects.toBeInstanceOf(InvalidClientConfigurationError);
  });
});
