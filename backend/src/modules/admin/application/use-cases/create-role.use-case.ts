import { Injectable } from '@nestjs/common';
import type { Role } from '../../../roles/domain/entities/role.entity.js';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository.js';
import { assertValidRoleName } from '../../../roles/domain/role-name.js';
import { RealmResourceFinder } from '../services/realm-resource-finder.js';

export interface CreateRoleInput {
  realmName: string;
  clientId?: string;
  name: string;
  description?: string;
}

@Injectable()
export class CreateRoleUseCase {
  constructor(
    private readonly finder: RealmResourceFinder,
    private readonly roles: RoleRepository,
  ) {}

  async execute({
    realmName,
    clientId,
    name,
    description,
  }: CreateRoleInput): Promise<Role> {
    assertValidRoleName(name);
    const realm = await this.finder.realm(realmName);
    return this.roles.create({
      realmId: realm.id,
      clientId: await this.finder.roleScope(realm, clientId),
      name,
      description: description?.trim() || null,
    });
  }
}
