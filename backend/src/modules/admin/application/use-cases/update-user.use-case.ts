import { Injectable } from '@nestjs/common';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { AdminAuthorizer } from '../../../roles/application/services/admin-authorizer.js';
import { LastRealmAdminError } from '../../../roles/domain/errors/last-realm-admin.error.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import { UserNotFoundError } from '../../../users/domain/errors/user-not-found.error.js';
import { UserRepository } from '../../../users/domain/repositories/user.repository.js';

export interface UpdateUserChanges {
  enabled?: boolean;
  emailVerified?: boolean;
}

export interface UpdateUserInput {
  realmName: string;
  userId: string;
  changes: UpdateUserChanges;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly users: UserRepository,
    private readonly authorizer: AdminAuthorizer,
  ) {}

  async execute({
    realmName,
    userId,
    changes,
  }: UpdateUserInput): Promise<User> {
    const realm = await this.realms.findByName(realmName);
    if (!realm) {
      throw new RealmNotFoundError(realmName);
    }
    const user = await this.users.findById(realm.id, userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (
      changes.enabled === false &&
      user.enabled &&
      (await this.authorizer.isLastEnabledAdmin(realm.name, user.id))
    ) {
      throw new LastRealmAdminError(realm.name);
    }

    return this.users.update(user.id, changes);
  }
}
