import { Injectable } from '@nestjs/common';
import type { Principal } from '../../../../shared/application/auth/principal.js';
import { MASTER_REALM_NAME } from '../../../realms/domain/entities/realm.entity.js';
import { ADMIN_ROLE_NAME } from '../../domain/entities/role.entity.js';
import { RoleRepository } from '../../domain/repositories/role.repository.js';

@Injectable()
export class AdminAuthorizer {
  constructor(private readonly roles: RoleRepository) {}

  isGlobalAdmin(principal: Principal): Promise<boolean> {
    if (principal.realm !== MASTER_REALM_NAME) {
      return Promise.resolve(false);
    }
    return this.isAdminOfOwnRealm(principal);
  }

  canAdminister(principal: Principal, realmName: string): Promise<boolean> {
    if (
      principal.realm !== MASTER_REALM_NAME &&
      principal.realm !== realmName
    ) {
      return Promise.resolve(false);
    }
    return this.isAdminOfOwnRealm(principal);
  }

  async isLastEnabledAdmin(
    realmName: string,
    userId: string,
  ): Promise<boolean> {
    const isAdmin = await this.roles.isUserInRole(
      realmName,
      userId,
      ADMIN_ROLE_NAME,
    );
    if (!isAdmin) {
      return false;
    }
    return (
      (await this.roles.countEnabledMembers(realmName, ADMIN_ROLE_NAME)) === 1
    );
  }

  private isAdminOfOwnRealm(principal: Principal): Promise<boolean> {
    return this.roles.isUserInRole(
      principal.realm,
      principal.subject,
      ADMIN_ROLE_NAME,
    );
  }
}
