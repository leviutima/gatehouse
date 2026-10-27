import { Injectable } from '@nestjs/common';
import { AdminAuthorizer } from '../../../roles/application/services/admin-authorizer.js';
import { LastRealmAdminError } from '../../../roles/domain/errors/last-realm-admin.error.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import { UserRepository } from '../../../users/domain/repositories/user.repository.js';
import { RealmResourceFinder } from '../services/realm-resource-finder.js';

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
    private readonly finder: RealmResourceFinder,
    private readonly users: UserRepository,
    private readonly authorizer: AdminAuthorizer,
  ) {}

  async execute({
    realmName,
    userId,
    changes,
  }: UpdateUserInput): Promise<User> {
    const realm = await this.finder.realm(realmName);
    const user = await this.finder.user(realm, userId);

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
