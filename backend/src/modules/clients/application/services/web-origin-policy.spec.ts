import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { ClientType } from '../../domain/client-type.js';
import { GrantType } from '../../domain/grant-type.js';
import { InMemoryClientRepository } from '../../testing/in-memory-client.repository.js';
import { WebOriginPolicy } from './web-origin-policy.js';

describe('WebOriginPolicy', () => {
  let clients: InMemoryClientRepository;
  let policy: WebOriginPolicy;

  beforeEach(async () => {
    clients = new InMemoryClientRepository();
    policy = new WebOriginPolicy(
      new InMemoryRealmRepository([
        aRealm({ name: 'shop' }),
        aRealm({ name: 'closed', enabled: false }),
      ]),
      clients,
    );
    for (const realmId of ['shop-id', 'closed-id']) {
      await clients.create({
        realmId,
        clientId: 'spa',
        name: 'SPA',
        type: ClientType.PUBLIC,
        secretHash: null,
        redirectUris: ['https://app.example.com/callback'],
        webOrigins: ['https://app.example.com'],
        grantTypes: [GrantType.AUTHORIZATION_CODE],
      });
    }
  });

  it('allows an origin registered by a client of the realm', async () => {
    await expect(
      policy.isAllowed('shop', 'https://app.example.com'),
    ).resolves.toBe(true);
  });

  it.each([
    ['an origin no client registered', 'shop', 'https://evil.example.com'],
    ['a realm that does not exist', 'missing', 'https://app.example.com'],
    ['a disabled realm', 'closed', 'https://app.example.com'],
  ])('refuses %s', async (_case, realmName, origin) => {
    await expect(policy.isAllowed(realmName, origin)).resolves.toBe(false);
  });

  it('stops allowing the origin of a disabled client', async () => {
    await clients.update(clients.clients[0].id, { enabled: false });

    await expect(
      policy.isAllowed('shop', 'https://app.example.com'),
    ).resolves.toBe(false);
  });
});
