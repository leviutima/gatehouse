import { Injectable } from '@nestjs/common';
import { AdminAuthorizer } from '../../../roles/application/services/admin-authorizer.js';
import { LastRealmAdminError } from '../../../roles/domain/errors/last-realm-admin.error.js';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository.js';
import { RealmResourceFinder } from '../services/realm-resource-finder.js';
import type { UserRoleInput } from './assign-user-role.use-case.js';

@Injectable()
export class UnassignUserRoleUseCase {
  constructor(
    private readonly finder: RealmResourceFinder,
    private readonly roles: RoleRepository,
    private readonly authorizer: AdminAuthorizer,
  ) {}

  async execute({ realmName, userId, roleName }: UserRoleInput): Promise<void> {
    const realm = await this.finder.realm(realmName);
    const user = await this.finder.user(realm, userId);
    const role = await this.finder.role(realm, roleName);
    if (
      role.isAdmin &&
      (await this.authorizer.isLastEnabledAdmin(realm.name, user.id))
    ) {
      throw new LastRealmAdminError(realm.name);
    }
    await this.roles.unassign(user.id, role.id);
  }
}
