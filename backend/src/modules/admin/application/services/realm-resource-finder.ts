import { Injectable } from '@nestjs/common';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import type { Role } from '../../../roles/domain/entities/role.entity.js';
import { RoleNotFoundError } from '../../../roles/domain/errors/role-not-found.error.js';
import { RoleRepository } from '../../../roles/domain/repositories/role.repository.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import { UserNotFoundError } from '../../../users/domain/errors/user-not-found.error.js';
import { UserRepository } from '../../../users/domain/repositories/user.repository.js';

@Injectable()
export class RealmResourceFinder {
  constructor(
    private readonly realms: RealmRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async realm(name: string): Promise<Realm> {
    const realm = await this.realms.findByName(name);
    if (!realm) {
      throw new RealmNotFoundError(name);
    }
    return realm;
  }

  async user(realm: Realm, userId: string): Promise<User> {
    const user = await this.users.findById(realm.id, userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    return user;
  }

  async role(realm: Realm, roleName: string): Promise<Role> {
    const role = await this.roles.findByName(realm.id, roleName);
    if (!role) {
      throw new RoleNotFoundError(roleName);
    }
    return role;
  }
}
