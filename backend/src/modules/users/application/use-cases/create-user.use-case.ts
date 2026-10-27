import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../../../shared/application/crypto/password-hasher.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import type { User } from '../../domain/entities/user.entity.js';
import { UserRepository } from '../../domain/repositories/user.repository.js';
import { resolveUsername } from '../../domain/username.js';

export interface CreateUserInput {
  realmName: string;
  username?: string;
  email: string;
  password: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    const realm = await this.realms.findByName(input.realmName);
    if (!realm) {
      throw new RealmNotFoundError(input.realmName);
    }

    const username = resolveUsername(realm, input);
    realm.passwordPolicy.assertAllowed(input.password);

    const passwordHash = await this.passwordHasher.hash(input.password);

    return this.users.create({
      realmId: realm.id,
      username,
      email: input.email,
      emailVerified: false,
      passwordHash,
    });
  }
}
