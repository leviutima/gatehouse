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
  abstract create(data: CreateRoleData): Promise<Role>;
  abstract assign(assignment: RoleAssignment): Promise<void>;
  abstract countMembers(roleId: string): Promise<number>;
}
