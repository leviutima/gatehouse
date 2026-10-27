import { Injectable } from '@nestjs/common';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import type { User } from '../../domain/entities/user.entity.js';
import {
  Page,
  UserRepository,
} from '../../domain/repositories/user.repository.js';

export interface ListUsersInput extends Page {
  realmName: string;
}

@Injectable()
export class ListUsersUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly users: UserRepository,
  ) {}

  async execute({ realmName, offset, limit }: ListUsersInput): Promise<User[]> {
    const realm = await this.realms.findByName(realmName);
    if (!realm) {
      throw new RealmNotFoundError(realmName);
    }
    return this.users.list(realm.id, { offset, limit });
  }
}
