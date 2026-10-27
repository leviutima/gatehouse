import { Injectable } from '@nestjs/common';
import type { Role } from '../../../roles/domain/entities/role.entity.js';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository.js';
import { RealmResourceFinder } from '../services/realm-resource-finder.js';

@Injectable()
export class ListRolesUseCase {
  constructor(
    private readonly finder: RealmResourceFinder,
    private readonly roles: RoleRepository,
  ) {}

  async execute(realmName: string): Promise<Role[]> {
    const realm = await this.finder.realm(realmName);
    return this.roles.list(realm.id);
  }
}
