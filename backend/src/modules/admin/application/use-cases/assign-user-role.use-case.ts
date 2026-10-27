import { Injectable } from '@nestjs/common';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository.js';
import { RealmResourceFinder } from '../services/realm-resource-finder.js';

export interface UserRoleInput {
  realmName: string;
  userId: string;
  roleName: string;
}

@Injectable()
export class AssignUserRoleUseCase {
  constructor(
    private readonly finder: RealmResourceFinder,
    private readonly roles: RoleRepository,
  ) {}

  async execute({ realmName, userId, roleName }: UserRoleInput): Promise<void> {
    const realm = await this.finder.realm(realmName);
    const user = await this.finder.user(realm, userId);
    const role = await this.finder.role(realm, roleName);
    await this.roles.assign({
      realmId: realm.id,
      userId: user.id,
      roleId: role.id,
    });
  }
}
