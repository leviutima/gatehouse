import type { Role } from '../entities/role.entity.js';

export interface CreateRoleData {
  realmId: string;
  name: string;
  description: string | null;
}

export interface RoleAssignment {
  realmId: string;
  userId: string;
  roleId: string;
}

export abstract class RoleRepository {
  abstract findByName(realmId: string, name: string): Promise<Role | null>;
  abstract list(realmId: string): Promise<Role[]>;
  abstract listForUser(userId: string): Promise<Role[]>;
  abstract create(data: CreateRoleData): Promise<Role>;
  abstract delete(roleId: string): Promise<void>;
  abstract assign(assignment: RoleAssignment): Promise<void>;
  abstract unassign(userId: string, roleId: string): Promise<void>;
  abstract countMembers(roleId: string): Promise<number>;
  abstract countEnabledMembers(
    realmName: string,
    roleName: string,
  ): Promise<number>;
  abstract isUserInRole(
    realmName: string,
    userId: string,
    roleName: string,
  ): Promise<boolean>;
}
