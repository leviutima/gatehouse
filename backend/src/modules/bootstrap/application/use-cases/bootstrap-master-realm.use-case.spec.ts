import type { Mock } from 'vitest';
import { PasswordHasher } from '../../../../shared/application/crypto/password-hasher.js';
import { TransactionManager } from '../../../../shared/application/persistence/transaction-manager.js';
import type { EnsureActiveSigningKeyUseCase } from '../../../signing-keys/application/use-cases/ensure-active-signing-key.use-case.js';
import { User } from '../../../users/domain/entities/user.entity.js';
import {
  CreateUserData,
  UserRepository,
} from '../../../users/domain/repositories/user.repository.js';
import { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmAlreadyExistsError } from '../../../realms/domain/errors/realm-already-exists.error.js';
import {
  CreateRealmData,
  RealmRepository,
} from '../../../realms/domain/repositories/realm.repository.js';
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

const initialAdmin = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'a-long-enough-password',
};

describe('BootstrapMasterRealmUseCase', () => {
  let realms: InMemoryRealmRepository;
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let transactions: FakeTransactionManager;
  let ensureActiveSigningKey: { execute: Mock<(realmId: string) => unknown> };
  let keyRequestsInsideTransaction: boolean[];
  let useCase: BootstrapMasterRealmUseCase;

  beforeEach(() => {
    realms = new InMemoryRealmRepository();
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    transactions = new FakeTransactionManager();
    keyRequestsInsideTransaction = [];
    ensureActiveSigningKey = {
      execute: vi.fn(() => {
        keyRequestsInsideTransaction.push(transactions.active);
        return Promise.resolve();
      }),
    };
    useCase = new BootstrapMasterRealmUseCase(
      realms,
      users,
      hasher,
      transactions,
      ensureActiveSigningKey as unknown as EnsureActiveSigningKeyUseCase,
    );
  });

  it('creates the master realm, its admin and signing key inside one transaction', async () => {
    const result = await useCase.execute(initialAdmin);

    expect(result.status).toBe('created');
    expect(transactions.runs).toHaveBeenCalledOnce();
    expect(ensureActiveSigningKey.execute).toHaveBeenCalledExactlyOnceWith(
      realms.realms[0].id,
    );
    expect(keyRequestsInsideTransaction).toEqual([true]);
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
  });

  it('stores only the password hash, never the password', async () => {
    await useCase.execute(initialAdmin);

    expect(hasher.hash).toHaveBeenCalledWith('a-long-enough-password');
    expect(users.users[0].passwordHash).toBe('hashed:a-long-enough-password');
  });

  it('does nothing when the master realm already exists', async () => {
    await realms.create({
      name: 'master',
      displayName: 'Master',
      loginIdentifier: 'USERNAME_OR_EMAIL',
    });

    const result = await useCase.execute(initialAdmin);

    expect(result.status).toBe('already_exists');
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.users).toHaveLength(0);
  });

  it('ensures an existing master realm has an active signing key', async () => {
    const master = await realms.create({
      name: 'master',
      displayName: 'Master',
      loginIdentifier: 'USERNAME_OR_EMAIL',
    });

    await useCase.execute(initialAdmin);

    expect(ensureActiveSigningKey.execute).toHaveBeenCalledExactlyOnceWith(
      master.id,
    );
    expect(transactions.runs).not.toHaveBeenCalled();
  });

  it('ignores a missing admin once the master realm exists', async () => {
    await realms.create({
      name: 'master',
      displayName: 'Master',
      loginIdentifier: 'USERNAME_OR_EMAIL',
    });

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
    const winner = await realms.create({
      name: 'master',
      displayName: 'Master',
      loginIdentifier: 'USERNAME_OR_EMAIL',
    });
    vi.spyOn(realms, 'findByName').mockResolvedValueOnce(null);
    realms.failCreateWith = new RealmAlreadyExistsError('master');

    await useCase.execute(initialAdmin);

    expect(ensureActiveSigningKey.execute).toHaveBeenCalledExactlyOnceWith(
      winner.id,
    );
  });

  it('propagates unexpected failures', async () => {
    realms.failCreateWith = new Error('database down');

    await expect(useCase.execute(initialAdmin)).rejects.toThrow(
      'database down',
    );
  });
});
