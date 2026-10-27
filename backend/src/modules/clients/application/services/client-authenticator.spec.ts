import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import { ClientType } from '../../domain/client-type.js';
import { Client, ClientProps } from '../../domain/entities/client.entity.js';
import { GrantType } from '../../domain/grant-type.js';
import { ClientRepository } from '../../domain/repositories/client.repository.js';
import { ClientAuthenticator } from './client-authenticator.js';

const now = new Date('2026-10-27T00:00:00Z');

function client(overrides: Partial<ClientProps> = {}): Client {
  return new Client({
    id: 'client-1',
    realmId: 'realm-1',
    clientId: 'billing',
    name: 'Billing',
    type: ClientType.CONFIDENTIAL,
    secretHash: 'hashed:right-secret',
    redirectUris: [],
    grantTypes: [GrantType.CLIENT_CREDENTIALS],
    enabled: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

class InMemoryClientRepository extends ClientRepository {
  constructor(private readonly clients: Client[]) {
    super();
  }

  findByClientId(realmId: string, clientId: string): Promise<Client | null> {
    return Promise.resolve(
      this.clients.find(
        (c) => c.realmId === realmId && c.clientId === clientId,
      ) ?? null,
    );
  }

  create(): Promise<Client> {
    return Promise.reject(new Error('not used'));
  }
}

class FakeSecretHasher extends SecretHasher {
  hash(secret: string): string {
    return `hashed:${secret}`;
  }

  verify(hash: string, secret: string): boolean {
    return hash === this.hash(secret);
  }
}

function authenticator(...clients: Client[]): ClientAuthenticator {
  return new ClientAuthenticator(
    new InMemoryClientRepository(clients),
    new FakeSecretHasher(),
  );
}

describe('ClientAuthenticator', () => {
  const credentials = { clientId: 'billing', clientSecret: 'right-secret' };

  it('returns the client when the secret matches', async () => {
    const billing = client();

    await expect(
      authenticator(billing).authenticate('realm-1', credentials),
    ).resolves.toBe(billing);
  });

  it.each<[string, Client[], typeof credentials, string]>([
    ['an unknown client', [], credentials, 'realm-1'],
    [
      'a wrong secret',
      [client()],
      { ...credentials, clientSecret: 'wrong-secret' },
      'realm-1',
    ],
    ['a client of another realm', [client()], credentials, 'realm-2'],
    ['a disabled client', [client({ enabled: false })], credentials, 'realm-1'],
    [
      'a public client',
      [
        client({
          type: ClientType.PUBLIC,
          secretHash: null,
          redirectUris: ['https://app.example.com/callback'],
          grantTypes: [GrantType.AUTHORIZATION_CODE],
        }),
      ],
      credentials,
      'realm-1',
    ],
  ])('rejects %s', async (_case, clients, attempt, realmId) => {
    await expect(
      authenticator(...clients).authenticate(realmId, attempt),
    ).resolves.toBeNull();
  });
});
