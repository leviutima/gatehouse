import { FakeSecretHasher } from '../../../../shared/testing/fake-secret-hasher.js';
import { SequentialSecretGenerator } from '../../../../shared/testing/sequential-secret-generator.js';
import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { ClientType } from '../../domain/client-type.js';
import { ClientNotFoundError } from '../../domain/errors/client-not-found.error.js';
import { InvalidClientConfigurationError } from '../../domain/errors/invalid-client-configuration.error.js';
import { PublicClientHasNoSecretError } from '../../domain/errors/public-client-has-no-secret.error.js';
import { GrantType } from '../../domain/grant-type.js';
import { InMemoryClientRepository } from '../../testing/in-memory-client.repository.js';
import { RealmClientFinder } from '../services/realm-client-finder.js';
import { CreateClientUseCase } from './create-client.use-case.js';
import { RotateClientSecretUseCase } from './rotate-client-secret.use-case.js';
import { UpdateClientUseCase } from './update-client.use-case.js';

describe('Client administration', () => {
  let clients: InMemoryClientRepository;
  let secrets: SequentialSecretGenerator;
  let updateClient: UpdateClientUseCase;
  let rotateSecret: RotateClientSecretUseCase;

  beforeEach(async () => {
    const realms = new InMemoryRealmRepository([aRealm()]);
    clients = new InMemoryClientRepository();
    secrets = new SequentialSecretGenerator();
    const hasher = new FakeSecretHasher();
    const finder = new RealmClientFinder(realms, clients);
    updateClient = new UpdateClientUseCase(finder, clients);
    rotateSecret = new RotateClientSecretUseCase(
      finder,
      clients,
      secrets,
      hasher,
    );

    const createClient = new CreateClientUseCase(
      realms,
      clients,
      secrets,
      hasher,
    );
    await createClient.execute({
      realmName: 'shop',
      clientId: 'web',
      name: 'Web',
      type: ClientType.PUBLIC,
      redirectUris: ['https://app.example.com/callback'],
      grantTypes: [GrantType.AUTHORIZATION_CODE],
    });
    await createClient.execute({
      realmName: 'shop',
      clientId: 'billing',
      name: 'Billing',
      type: ClientType.CONFIDENTIAL,
      redirectUris: [],
      grantTypes: [GrantType.CLIENT_CREDENTIALS],
    });
  });

  describe('UpdateClientUseCase', () => {
    it('changes the name, redirect URIs, grants and status', async () => {
      const client = await updateClient.execute({
        realmName: 'shop',
        clientId: 'web',
        changes: {
          name: '  Web app  ',
          redirectUris: ['https://app.example.com/cb'],
          grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
          enabled: false,
        },
      });

      expect(client).toMatchObject({
        name: 'Web app',
        redirectUris: ['https://app.example.com/cb'],
        grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
        enabled: false,
      });
    });

    it('keeps the fields it was not asked to change', async () => {
      const client = await updateClient.execute({
        realmName: 'shop',
        clientId: 'web',
        changes: { enabled: false },
      });

      expect(client).toMatchObject({
        name: 'Web',
        redirectUris: ['https://app.example.com/callback'],
      });
    });

    it.each([
      [
        'a public client asking for client_credentials',
        { grantTypes: [GrantType.CLIENT_CREDENTIALS] },
      ],
      [
        'authorization_code without redirect URIs',
        { redirectUris: [] as string[] },
      ],
      ['an invalid redirect URI', { redirectUris: ['javascript:alert(1)'] }],
      ['a blank name', { name: '  ' }],
    ])('rejects %s', async (_case, changes) => {
      await expect(
        updateClient.execute({ realmName: 'shop', clientId: 'web', changes }),
      ).rejects.toBeInstanceOf(InvalidClientConfigurationError);
      expect(clients.clients[0].redirectUris).toEqual([
        'https://app.example.com/callback',
      ]);
    });

    it('fails for an unknown client', async () => {
      await expect(
        updateClient.execute({
          realmName: 'shop',
          clientId: 'ghost',
          changes: {},
        }),
      ).rejects.toBeInstanceOf(ClientNotFoundError);
    });
  });

  describe('RotateClientSecretUseCase', () => {
    it('replaces the secret of a confidential client', async () => {
      const secret = await rotateSecret.execute({
        realmName: 'shop',
        clientId: 'billing',
      });

      const billing = clients.clients.find(
        ({ clientId }) => clientId === 'billing',
      );
      expect(secret).toBe('secret-2');
      expect(billing?.secretHash).toBe('hashed:secret-2');
    });

    it('refuses to give a public client a secret', async () => {
      await expect(
        rotateSecret.execute({ realmName: 'shop', clientId: 'web' }),
      ).rejects.toBeInstanceOf(PublicClientHasNoSecretError);
    });
  });
});
