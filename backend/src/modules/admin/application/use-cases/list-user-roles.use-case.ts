import { Injectable } from '@nestjs/common';
import type { Role } from '../../../roles/domain/entities/role.entity.js';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository.js';
import { RealmResourceFinder } from '../services/realm-resource-finder.js';

export interface ListUserRolesInput {
  realmName: string;
  userId: string;
}

@Injectable()
export class ListUserRolesUseCase {
  constructor(
    private readonly finder: RealmResourceFinder,
    private readonly roles: RoleRepository,
  ) {}

  async execute({ realmName, userId }: ListUserRolesInput): Promise<Role[]> {
    const realm = await this.finder.realm(realmName);
    const user = await this.finder.user(realm, userId);
    return this.roles.listForUser(user.id);
  }
}
