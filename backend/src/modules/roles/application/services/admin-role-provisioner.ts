import { Injectable } from '@nestjs/common';
import { ADMIN_ROLE_NAME, Role } from '../../domain/entities/role.entity.js';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists.error.js';
import { RoleRepository } from '../../domain/repositories/role.repository.js';

const ADMIN_ROLE_DESCRIPTION = 'Administers the realm';

@Injectable()
export class AdminRoleProvisioner {
  constructor(private readonly roles: RoleRepository) {}

  async ensureAdminRole(realmId: string): Promise<Role> {
    const existing = await this.roles.findByName(realmId, ADMIN_ROLE_NAME);
    if (existing) {
      return existing;
    }

    try {
      return await this.roles.create({
        realmId,
        name: ADMIN_ROLE_NAME,
        description: ADMIN_ROLE_DESCRIPTION,
      });
    } catch (error) {
      if (error instanceof RoleAlreadyExistsError) {
        const winner = await this.roles.findByName(realmId, ADMIN_ROLE_NAME);
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }

  async grantAdmin(realmId: string, userId: string): Promise<void> {
    const role = await this.ensureAdminRole(realmId);
    await this.roles.assign({ realmId, userId, roleId: role.id });
  }

  async hasAnyAdmin(realmId: string): Promise<boolean> {
    const role = await this.ensureAdminRole(realmId);
    return (await this.roles.countMembers(role.id)) > 0;
  }
}
