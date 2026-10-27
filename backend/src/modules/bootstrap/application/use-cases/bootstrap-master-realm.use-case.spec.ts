import { KeyEncryptor } from '../../../../shared/application/crypto/key-encryptor.js';
import { PasswordHasher } from '../../../../shared/application/crypto/password-hasher.js';
import { TransactionManager } from '../../../../shared/application/persistence/transaction-manager.js';
import { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmAlreadyExistsError } from '../../../realms/domain/errors/realm-already-exists.error.js';
import { WeakPasswordError } from '../../../realms/domain/errors/weak-password.error.js';
import {
  CreateRealmData,
  RealmRepository,
} from '../../../realms/domain/repositories/realm.repository.js';
import {
  GeneratedKeyPair,
  KeyPairGenerator,
} from '../../../signing-keys/application/key-pair-generator.js';
import { SigningKeyProvisioner } from '../../../signing-keys/application/services/signing-key-provisioner.js';
import { SigningKey } from '../../../signing-keys/domain/entities/signing-key.entity.js';
import {
  CreateSigningKeyData,
  SigningKeyRepository,
} from '../../../signing-keys/domain/repositories/signing-key.repository.js';
import { UserRegistrar } from '../../../users/application/services/user-registrar.js';
import { User } from '../../../users/domain/entities/user.entity.js';
import { InvalidUsernameError } from '../../../users/domain/errors/invalid-username.error.js';
import {
  CreateUserData,
  UserRepository,
} from '../../../users/domain/repositories/user.repository.js';
import { MasterAdminNotConfiguredError } from '../errors/master-admin-not-configured.error.js';
import { BootstrapMasterRealmUseCase } from './bootstrap-master-realm.use-case.js';

const now = new Date('2026-10-24T00:00:00Z');

class InMemoryRealmRepository extends RealmRepository {
  readonly realms: Realm[] = [];
  failCreateWith: Error | null = null;

  findByName(name: string): Promise<Realm | null> {
    return Promise.resolve(this.realms.find((r) => r.name === name) ?? null);
  }

  create(data: CreateRealmData): Promise<Realm> {
    if (this.failCreateWith) {
      return Promise.reject(this.failCreateWith);
    }
    const realm = new Realm({
      id: `realm-${this.realms.length + 1}`,
      enabled: true,
      passwordMinLength: 12,
      accessTokenLifespan: 300,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.realms.push(realm);
    return Promise.resolve(realm);
  }
}

class InMemoryUserRepository extends UserRepository {
  readonly users: User[] = [];

  create(data: CreateUserData): Promise<User> {
    const user = new User({
      id: `user-${this.users.length + 1}`,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.users.push(user);
    return Promise.resolve(user);
  }
}

class FakeTransactionManager extends TransactionManager {
  readonly runs = vi.fn();
  active = false;

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.runs();
    this.active = true;
    try {
      return await work();
    } finally {
      this.active = false;
    }
  }
}

class InMemorySigningKeyRepository extends SigningKeyRepository {
  readonly keys: SigningKey[] = [];
  readonly createdInsideTransaction: boolean[] = [];

  constructor(private readonly transactions: FakeTransactionManager) {
    super();
  }

  findActive(realmId: string): Promise<SigningKey | null> {
    return Promise.resolve(
      this.keys.find((key) => key.realmId === realmId && key.isActive) ?? null,
    );
  }

  findPublished(realmId: string): Promise<SigningKey[]> {
    return Promise.resolve(this.keys.filter((key) => key.realmId === realmId));
  }

  create(data: CreateSigningKeyData): Promise<SigningKey> {
    this.createdInsideTransaction.push(this.transactions.active);
    const key = new SigningKey({
      id: `key-${this.keys.length + 1}`,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.keys.push(key);
    return Promise.resolve(key);
  }
}

class FakePasswordHasher extends PasswordHasher {
  readonly hash = vi.fn((password: string) =>
    Promise.resolve(`hashed:${password}`),
  );

  verify(): Promise<boolean> {
    return Promise.resolve(false);
  }

  needsRehash(): boolean {
    return false;
  }
}

class FakeKeyPairGenerator extends KeyPairGenerator {
  readonly algorithm = 'ES256';

  generate(): Promise<GeneratedKeyPair> {
    return Promise.resolve({
      publicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
      privateKeyPkcs8: 'private-pem',
    });
  }
}

class FakeKeyEncryptor extends KeyEncryptor {
  encrypt(plaintext: string): string {
    return `encrypted:${plaintext}`;
  }

  decrypt(payload: string): string {
    return payload.replace('encrypted:', '');
  }
}

const initialAdmin = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'a-long-enough-password',
};

describe('BootstrapMasterRealmUseCase', () => {
  let realms: InMemoryRealmRepository;
  let users: InMemoryUserRepository;
  let keys: InMemorySigningKeyRepository;
  let hasher: FakePasswordHasher;
  let transactions: FakeTransactionManager;
  let useCase: BootstrapMasterRealmUseCase;

  const createMaster = () =>
    realms.create({
      name: 'master',
      displayName: 'Master',
      loginIdentifier: 'USERNAME_OR_EMAIL',
    });

  beforeEach(() => {
    realms = new InMemoryRealmRepository();
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    transactions = new FakeTransactionManager();
    keys = new InMemorySigningKeyRepository(transactions);
    useCase = new BootstrapMasterRealmUseCase(
      realms,
      new UserRegistrar(users, hasher),
      new SigningKeyProvisioner(
        keys,
        new FakeKeyPairGenerator(),
        new FakeKeyEncryptor(),
      ),
      transactions,
    );
  });

  it('creates the master realm, its admin and signing key inside one transaction', async () => {
    const result = await useCase.execute(initialAdmin);

    expect(result.status).toBe('created');
    expect(transactions.runs).toHaveBeenCalledOnce();
    expect(realms.realms).toHaveLength(1);
    expect(realms.realms[0]).toMatchObject({
      name: 'master',
      loginIdentifier: 'USERNAME_OR_EMAIL',
    });
    expect(realms.realms[0].isMaster).toBe(true);
    expect(users.users).toHaveLength(1);
    expect(users.users[0]).toMatchObject({
      realmId: realms.realms[0].id,
      username: 'admin',
      email: 'admin@example.com',
    });
    expect(keys.keys).toHaveLength(1);
    expect(keys.keys[0]).toMatchObject({
      realmId: realms.realms[0].id,
      status: 'ACTIVE',
    });
    expect(keys.createdInsideTransaction).toEqual([true]);
  });

  it('stores only the password hash, never the password', async () => {
    await useCase.execute(initialAdmin);

    expect(hasher.hash).toHaveBeenCalledWith('a-long-enough-password');
    expect(users.users[0].passwordHash).toBe('hashed:a-long-enough-password');
  });

  it('applies the realm password policy to the initial admin', async () => {
    await expect(
      useCase.execute({ ...initialAdmin, password: 'too-short' }),
    ).rejects.toBeInstanceOf(WeakPasswordError);
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(keys.keys).toHaveLength(0);
  });

  it('applies the username format to the initial admin', async () => {
    await expect(
      useCase.execute({ ...initialAdmin, username: 'admin user' }),
    ).rejects.toBeInstanceOf(InvalidUsernameError);
    expect(users.users).toHaveLength(0);
  });

  it('does not create a user when the master realm already exists', async () => {
    await createMaster();

    const result = await useCase.execute(initialAdmin);

    expect(result.status).toBe('already_exists');
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.users).toHaveLength(0);
  });

  it('ensures an existing master realm has an active signing key', async () => {
    const master = await createMaster();

    await useCase.execute(initialAdmin);
    await useCase.execute(initialAdmin);

    expect(keys.keys).toHaveLength(1);
    expect(keys.keys[0].realmId).toBe(master.id);
    expect(transactions.runs).not.toHaveBeenCalled();
  });

  it('ignores a missing admin once the master realm exists', async () => {
    await createMaster();

    await expect(useCase.execute(null)).resolves.toEqual({
      status: 'already_exists',
    });
  });

  it('refuses to start without an admin while the master realm is missing', async () => {
    await expect(useCase.execute(null)).rejects.toBeInstanceOf(
      MasterAdminNotConfiguredError,
    );
    expect(realms.realms).toHaveLength(0);
  });

  it('reports already_exists when a concurrent bootstrap won the race', async () => {
    realms.failCreateWith = new RealmAlreadyExistsError('master');

    await expect(useCase.execute(initialAdmin)).resolves.toEqual({
      status: 'already_exists',
    });
    expect(users.users).toHaveLength(0);
  });

  it('ensures the signing key of the master realm created by the race winner', async () => {
    const winner = await createMaster();
    vi.spyOn(realms, 'findByName').mockResolvedValueOnce(null);
    realms.failCreateWith = new RealmAlreadyExistsError('master');

    await useCase.execute(initialAdmin);

    expect(keys.keys).toHaveLength(1);
    expect(keys.keys[0].realmId).toBe(winner.id);
  });

  it('propagates unexpected failures', async () => {
    realms.failCreateWith = new Error('database down');

    await expect(useCase.execute(initialAdmin)).rejects.toThrow(
      'database down',
    );
  });
});
