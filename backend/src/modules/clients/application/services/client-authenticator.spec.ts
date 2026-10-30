import { FakeSecretHasher } from '../../../../shared/testing/fake-secret-hasher.js';
import { ClientType } from '../../domain/client-type.js';
import { Client, ClientProps } from '../../domain/entities/client.entity.js';
import { GrantType } from '../../domain/grant-type.js';
import { InMemoryClientRepository } from '../../testing/in-memory-client.repository.js';
import {
  ClientAuthenticator,
  ClientCredentials,
} from './client-authenticator.js';

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

function authenticator(...clients: Client[]): ClientAuthenticator {
  return new ClientAuthenticator(
    new InMemoryClientRepository(clients),
    new FakeSecretHasher(),
  );
}

describe('ClientAuthenticator', () => {
  const credentials: ClientCredentials = {
    clientId: 'billing',
    clientSecret: 'right-secret',
  };

  it('returns the client when the secret matches', async () => {
    const billing = client();

    await expect(
      authenticator(billing).authenticate('realm-1', credentials),
    ).resolves.toBe(billing);
  });

  it.each<[string, Client[], ClientCredentials, string]>([
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
      'a public client presenting a secret',
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
    [
      'a confidential client without a secret',
      [client()],
      { ...credentials, clientSecret: null },
      'realm-1',
    ],
  ])('rejects %s', async (_case, clients, attempt, realmId) => {
    await expect(
      authenticator(...clients).authenticate(realmId, attempt),
    ).resolves.toBeNull();
  });

  it('identifies a public client by its id alone', async () => {
    const web = client({
      clientId: 'web',
      type: ClientType.PUBLIC,
      secretHash: null,
      redirectUris: ['https://app.example.com/callback'],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });

    await expect(
      authenticator(web).authenticate('realm-1', {
        clientId: 'web',
        clientSecret: null,
      }),
    ).resolves.toBe(web);
  });
});
