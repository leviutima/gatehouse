import { FakeKeyEncryptor } from '../../../../shared/testing/fake-key-encryptor.js';
import { FakePasswordHasher } from '../../../../shared/testing/fake-password-hasher.js';
import { FakeTransactionManager } from '../../../../shared/testing/fake-transaction-manager.js';
import { RealmAlreadyExistsError } from '../../../realms/domain/errors/realm-already-exists.error.js';
import { WeakPasswordError } from '../../../realms/domain/errors/weak-password.error.js';
import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { AdminRoleProvisioner } from '../../../roles/application/services/admin-role-provisioner.js';
import { InMemoryRoleRepository } from '../../../roles/testing/in-memory-role.repository.js';
import { SigningKeyProvisioner } from '../../../signing-keys/application/services/signing-key-provisioner.js';
import { FakeKeyPairGenerator } from '../../../signing-keys/testing/fake-key-pair-generator.js';
import { InMemorySigningKeyRepository } from '../../../signing-keys/testing/in-memory-signing-key.repository.js';
import { UserRegistrar } from '../../../users/application/services/user-registrar.js';
import { InvalidUsernameError } from '../../../users/domain/errors/invalid-username.error.js';
import { InMemoryUserRepository } from '../../../users/testing/in-memory-user.repository.js';
import { MasterAdminNotConfiguredError } from '../errors/master-admin-not-configured.error.js';
import { BootstrapMasterRealmUseCase } from './bootstrap-master-realm.use-case.js';

const initialAdmin = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'a-long-enough-password',
};

describe('BootstrapMasterRealmUseCase', () => {
  let realms: InMemoryRealmRepository;
  let users: InMemoryUserRepository;
  let keys: InMemorySigningKeyRepository;
  let roles: InMemoryRoleRepository;
  let hasher: FakePasswordHasher;
  let transactions: FakeTransactionManager;
  let keysCreatedInTransaction: boolean[];
  let adminsGrantedInTransaction: boolean[];
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
    keys = new InMemorySigningKeyRepository();
    roles = new InMemoryRoleRepository(realms, users);

    keysCreatedInTransaction = [];
    const createKey = keys.create.bind(keys);
    vi.spyOn(keys, 'create').mockImplementation((data) => {
      keysCreatedInTransaction.push(transactions.active);
      return createKey(data);
    });
    adminsGrantedInTransaction = [];
    const assign = roles.assign.bind(roles);
    vi.spyOn(roles, 'assign').mockImplementation((assignment) => {
      adminsGrantedInTransaction.push(transactions.active);
      return assign(assignment);
    });

    useCase = new BootstrapMasterRealmUseCase(
      realms,
      new UserRegistrar(users, hasher),
      users,
      new SigningKeyProvisioner(
        keys,
        new FakeKeyPairGenerator(),
        new FakeKeyEncryptor(),
      ),
      new AdminRoleProvisioner(roles),
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
    expect(keysCreatedInTransaction).toEqual([true]);
  });

  it('makes the initial admin an admin of the master realm inside the transaction', async () => {
    await useCase.execute(initialAdmin);

    expect(roles.roles).toEqual([
      expect.objectContaining({ realmId: realms.realms[0].id, name: 'admin' }),
    ]);
    expect(roles.assignments).toEqual([
      {
        realmId: realms.realms[0].id,
        userId: users.users[0].id,
        roleId: roles.roles[0].id,
      },
    ]);
    expect(adminsGrantedInTransaction).toEqual([true]);
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

  it('grants the admin role to the configured admin when master has no admin', async () => {
    const master = await createMaster();
    const existing = await users.create({
      realmId: master.id,
      username: 'admin',
      email: 'admin@example.com',
      emailVerified: false,
      passwordHash: 'hash',
    });

    const result = await useCase.execute({
      ...initialAdmin,
      username: 'ADMIN',
    });

    expect(result).toEqual({ status: 'admin_recovered', admin: existing });
    expect(roles.assignments).toEqual([
      { realmId: master.id, userId: existing.id, roleId: roles.roles[0].id },
    ]);
  });

  it('leaves the admins alone when master already has one', async () => {
    const master = await createMaster();
    await users.create({
      realmId: master.id,
      username: 'admin',
      email: 'admin@example.com',
      emailVerified: false,
      passwordHash: 'hash',
    });
    const adminRoles = new AdminRoleProvisioner(roles);
    await adminRoles.grantAdmin(master.id, 'another-admin');

    const result = await useCase.execute(initialAdmin);

    expect(result).toEqual({ status: 'already_exists' });
    expect(roles.assignments.map(({ userId }) => userId)).toEqual([
      'another-admin',
    ]);
  });

  it('does not recover an admin the master realm does not have as a user', async () => {
    await createMaster();

    await expect(useCase.execute(initialAdmin)).resolves.toEqual({
      status: 'already_exists',
    });
    expect(roles.assignments).toHaveLength(0);
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
    vi.spyOn(realms, 'create').mockRejectedValueOnce(
      new RealmAlreadyExistsError('master'),
    );

    await expect(useCase.execute(initialAdmin)).resolves.toEqual({
      status: 'already_exists',
    });
    expect(users.users).toHaveLength(0);
  });

  it('ensures the signing key of the master realm created by the race winner', async () => {
    const winner = await createMaster();
    vi.spyOn(realms, 'findByName').mockResolvedValueOnce(null);

    await useCase.execute(initialAdmin);

    expect(keys.keys).toHaveLength(1);
    expect(keys.keys[0].realmId).toBe(winner.id);
  });

  it('propagates unexpected failures', async () => {
    vi.spyOn(realms, 'create').mockRejectedValueOnce(
      new Error('database down'),
    );

    await expect(useCase.execute(initialAdmin)).rejects.toThrow(
      'database down',
    );
  });
});
