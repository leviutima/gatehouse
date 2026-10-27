import { Injectable } from '@nestjs/common';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import type { User } from '../../domain/entities/user.entity.js';
import {
  RegisterUserInput,
  UserRegistrar,
} from '../services/user-registrar.js';

export interface CreateUserInput extends RegisterUserInput {
  realmName: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly userRegistrar: UserRegistrar,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    const realm = await this.realms.findByName(input.realmName);
    if (!realm) {
      throw new RealmNotFoundError(input.realmName);
    }
    return this.userRegistrar.register(realm, input);
  }
}
