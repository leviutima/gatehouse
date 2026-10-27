import { Injectable } from '@nestjs/common';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import type { User } from '../../domain/entities/user.entity.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { UserRepository } from '../../domain/repositories/user.repository.js';

export interface GetUserInput {
  realmName: string;
  userId: string;
}

@Injectable()
export class GetUserUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly users: UserRepository,
  ) {}

  async execute({ realmName, userId }: GetUserInput): Promise<User> {
    const realm = await this.realms.findByName(realmName);
    if (!realm) {
      throw new RealmNotFoundError(realmName);
    }
    const user = await this.users.findById(realm.id, userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    return user;
  }
}
