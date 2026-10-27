import { Injectable } from '@nestjs/common';
import { ReservedRoleError } from '../../../roles/domain/errors/reserved-role.error.js';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository.js';
import { RealmResourceFinder } from '../services/realm-resource-finder.js';

export interface DeleteRoleInput {
  realmName: string;
  roleName: string;
}

@Injectable()
export class DeleteRoleUseCase {
  constructor(
    private readonly finder: RealmResourceFinder,
    private readonly roles: RoleRepository,
  ) {}

  async execute({ realmName, roleName }: DeleteRoleInput): Promise<void> {
    const realm = await this.finder.realm(realmName);
    const role = await this.finder.role(realm, roleName);
    if (role.isAdmin) {
      throw new ReservedRoleError(role.name);
    }
    await this.roles.delete(role.id);
  }
}
