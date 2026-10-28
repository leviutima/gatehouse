import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists.error.js';
import { InMemoryRoleRepository } from '../../testing/in-memory-role.repository.js';
import { AdminRoleProvisioner } from './admin-role-provisioner.js';

describe('AdminRoleProvisioner', () => {
  let roles: InMemoryRoleRepository;
  let provisioner: AdminRoleProvisioner;

  beforeEach(() => {
    roles = new InMemoryRoleRepository();
    provisioner = new AdminRoleProvisioner(roles);
  });

  it('creates the admin role of the realm once', async () => {
    const first = await provisioner.ensureAdminRole('shop-id');
    const second = await provisioner.ensureAdminRole('shop-id');

    expect(first).toBe(second);
    expect(first.isAdmin).toBe(true);
    expect(roles.roles).toHaveLength(1);
  });

  it('keeps the admin roles of different realms apart', async () => {
    const shop = await provisioner.ensureAdminRole('shop-id');
    const master = await provisioner.ensureAdminRole('master-id');

    expect(shop.id).not.toBe(master.id);
  });

  it('returns the role created by a concurrent caller', async () => {
    const create = roles.create.bind(roles);
    vi.spyOn(roles, 'create').mockImplementationOnce(async (data) => {
      await create(data);
      throw new RoleAlreadyExistsError(data.name);
    });

    const role = await provisioner.ensureAdminRole('shop-id');

    expect(role).toBe(roles.roles[0]);
    expect(roles.roles).toHaveLength(1);
  });

  it('grants the admin role idempotently', async () => {
    await provisioner.grantAdmin('shop-id', 'user-1');
    await provisioner.grantAdmin('shop-id', 'user-1');

    expect(roles.assignments).toEqual([
      { realmId: 'shop-id', userId: 'user-1', roleId: roles.roles[0].id },
    ]);
  });

  it('tells whether the realm has any admin', async () => {
    await expect(provisioner.hasAnyAdmin('shop-id')).resolves.toBe(false);

    await provisioner.grantAdmin('shop-id', 'user-1');

    await expect(provisioner.hasAnyAdmin('shop-id')).resolves.toBe(true);
  });
});
