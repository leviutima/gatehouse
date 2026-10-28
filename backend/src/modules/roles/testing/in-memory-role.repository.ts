import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { InMemoryRealmRepository } from '../../realms/testing/in-memory-realm.repository.js';
import { InMemoryUserRepository } from '../../users/testing/in-memory-user.repository.js';
import { Role } from '../domain/entities/role.entity.js';
import { RoleAlreadyExistsError } from '../domain/errors/role-already-exists.error.js';
import {
  CreateRoleData,
  RoleAssignment,
  RoleRepository,
} from '../domain/repositories/role.repository.js';

export class InMemoryRoleRepository extends RoleRepository {
  readonly roles: Role[] = [];
  readonly assignments: RoleAssignment[] = [];

  constructor(
    private readonly realms: InMemoryRealmRepository = new InMemoryRealmRepository(),
    private readonly users: InMemoryUserRepository = new InMemoryUserRepository(),
  ) {
    super();
  }

  findByName(realmId: string, name: string): Promise<Role | null> {
    return Promise.resolve(
      this.roles.find(
        (role) => role.realmId === realmId && role.name === name,
      ) ?? null,
    );
  }

  list(realmId: string): Promise<Role[]> {
    return Promise.resolve(
      this.roles
        .filter((role) => role.realmId === realmId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  listForUser(userId: string): Promise<Role[]> {
    const roleIds = this.assignments
      .filter((assignment) => assignment.userId === userId)
      .map(({ roleId }) => roleId);
    return Promise.resolve(
      this.roles
        .filter((role) => roleIds.includes(role.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  create(data: CreateRoleData): Promise<Role> {
    if (
      this.roles.some(
        (role) => role.realmId === data.realmId && role.name === data.name,
      )
    ) {
      return Promise.reject(new RoleAlreadyExistsError(data.name));
    }
    const role = new Role({
      id: `role-${this.roles.length + 1}`,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
      ...data,
    });
    this.roles.push(role);
    return Promise.resolve(role);
  }

  delete(roleId: string): Promise<void> {
    this.removeWhere(this.roles, (role) => role.id === roleId);
    this.removeWhere(
      this.assignments,
      (assignment) => assignment.roleId === roleId,
    );
    return Promise.resolve();
  }

  assign(assignment: RoleAssignment): Promise<void> {
    const role = this.roles.find(({ id }) => id === assignment.roleId);
    if (role && role.realmId !== assignment.realmId) {
      return Promise.reject(new Error('role belongs to another realm'));
    }
    const assigned = this.assignments.some(
      ({ userId, roleId }) =>
        userId === assignment.userId && roleId === assignment.roleId,
    );
    if (!assigned) {
      this.assignments.push(assignment);
    }
    return Promise.resolve();
  }

  unassign(userId: string, roleId: string): Promise<void> {
    this.removeWhere(
      this.assignments,
      (assignment) =>
        assignment.userId === userId && assignment.roleId === roleId,
    );
    return Promise.resolve();
  }

  countMembers(roleId: string): Promise<number> {
    return Promise.resolve(
      this.assignments.filter((assignment) => assignment.roleId === roleId)
        .length,
    );
  }

  countEnabledMembers(realmName: string, roleName: string): Promise<number> {
    const role = this.roleIn(realmName, roleName);
    return Promise.resolve(
      role
        ? this.assignments.filter(
            (assignment) =>
              assignment.roleId === role.id &&
              this.isEnabled(assignment.userId),
          ).length
        : 0,
    );
  }

  isUserInRole(
    realmName: string,
    userId: string,
    roleName: string,
  ): Promise<boolean> {
    const role = this.roleIn(realmName, roleName);
    return Promise.resolve(
      !!role &&
        this.isEnabled(userId) &&
        this.assignments.some(
          (assignment) =>
            assignment.roleId === role.id && assignment.userId === userId,
        ),
    );
  }

  private roleIn(realmName: string, roleName: string): Role | undefined {
    const realm = this.realms.realms.find(({ name }) => name === realmName);
    return this.roles.find(
      (role) => role.realmId === realm?.id && role.name === roleName,
    );
  }

  private isEnabled(userId: string): boolean {
    return this.users.users.find(({ id }) => id === userId)?.enabled ?? false;
  }

  private removeWhere<T>(items: T[], predicate: (item: T) => boolean): void {
    for (let index = items.length - 1; index >= 0; index--) {
      if (predicate(items[index])) {
        items.splice(index, 1);
      }
    }
  }
}
