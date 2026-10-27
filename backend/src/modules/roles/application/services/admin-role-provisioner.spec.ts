import { ADMIN_ROLE_NAME, Role } from '../../domain/entities/role.entity.js';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists.error.js';
import {
  CreateRoleData,
  RoleAssignment,
  RoleRepository,
} from '../../domain/repositories/role.repository.js';
import { AdminRoleProvisioner } from './admin-role-provisioner.js';

const now = new Date('2026-10-28T00:00:00Z');

class InMemoryRoleRepository extends RoleRepository {
  readonly roles: Role[] = [];
  readonly assignments: RoleAssignment[] = [];
  concurrentWinner: Role | null = null;

  findByName(realmId: string, name: string): Promise<Role | null> {
    return Promise.resolve(
      this.roles.find(
        (role) => role.realmId === realmId && role.name === name,
      ) ?? null,
    );
  }

  create(data: CreateRoleData): Promise<Role> {
    if (this.concurrentWinner) {
      this.roles.push(this.concurrentWinner);
      return Promise.reject(new RoleAlreadyExistsError(data.name));
    }
    const role = new Role({
      id: `role-${this.roles.length + 1}`,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.roles.push(role);
    return Promise.resolve(role);
  }

  assign(assignment: RoleAssignment): Promise<void> {
    const assigned = this.assignments.some(
      ({ userId, roleId }) =>
        userId === assignment.userId && roleId === assignment.roleId,
    );
    if (!assigned) {
      this.assignments.push(assignment);
    }
    return Promise.resolve();
  }

  countMembers(roleId: string): Promise<number> {
    return Promise.resolve(
      this.assignments.filter((assignment) => assignment.roleId === roleId)
        .length,
    );
  }

  countEnabledMembers(): Promise<number> {
    return Promise.resolve(0);
  }

  isUserInRole(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

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
    const winner = new Role({
      id: 'winner',
      realmId: 'shop-id',
      name: ADMIN_ROLE_NAME,
      description: null,
      createdAt: now,
      updatedAt: now,
    });
    roles.concurrentWinner = winner;

    await expect(provisioner.ensureAdminRole('shop-id')).resolves.toBe(winner);
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
