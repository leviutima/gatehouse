import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { ClientType } from '../../domain/client-type.js';
import { Client } from '../../domain/entities/client.entity.js';
import { InvalidClientConfigurationError } from '../../domain/errors/invalid-client-configuration.error.js';
import { GrantType } from '../../domain/grant-type.js';
import {
  ClientRepository,
  CreateClientData,
} from '../../domain/repositories/client.repository.js';
import { CreateClientUseCase } from './create-client.use-case.js';

const now = new Date('2026-10-27T00:00:00Z');

class InMemoryRealmRepository extends RealmRepository {
  private readonly shop = new Realm({
    id: 'shop-id',
    name: 'shop',
    displayName: 'Shop',
    enabled: true,
    loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
    passwordMinLength: 12,
    accessTokenLifespan: 300,
    createdAt: now,
    updatedAt: now,
  });

  findByName(name: string): Promise<Realm | null> {
    return Promise.resolve(name === this.shop.name ? this.shop : null);
  }

  list(): Promise<Realm[]> {
    return Promise.resolve([this.shop]);
  }

  update(): Promise<Realm> {
    return Promise.reject(new Error('not used'));
  }

  create(): Promise<Realm> {
    return Promise.reject(new Error('not used'));
  }
}

class InMemoryClientRepository extends ClientRepository {
  readonly clients: Client[] = [];

  findByClientId(): Promise<Client | null> {
    return Promise.reject(new Error('not used'));
  }

  create(data: CreateClientData): Promise<Client> {
    const client = new Client({
      id: `client-${this.clients.length + 1}`,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.clients.push(client);
    return Promise.resolve(client);
  }
}

class FakeSecretHasher extends SecretHasher {
  hash(secret: string): string {
    return `hashed:${secret}`;
  }

  verify(): boolean {
    return false;
  }
}

class SequentialSecretGenerator extends SecretGenerator {
  readonly generate = vi.fn(() => `secret-${this.generate.mock.calls.length}`);
}

describe('CreateClientUseCase', () => {
  let clients: InMemoryClientRepository;
  let secrets: SequentialSecretGenerator;
  let useCase: CreateClientUseCase;

  beforeEach(() => {
    clients = new InMemoryClientRepository();
    secrets = new SequentialSecretGenerator();
    useCase = new CreateClientUseCase(
      new InMemoryRealmRepository(),
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
});
