import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../../../shared/application/crypto/password-hasher.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import type { User } from '../../domain/entities/user.entity.js';
import { UserRepository } from '../../domain/repositories/user.repository.js';
import { resolveUsername } from '../../domain/username.js';

export interface RegisterUserInput {
  username?: string;
  email: string;
  password: string;
}

@Injectable()
export class UserRegistrar {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(realm: Realm, input: RegisterUserInput): Promise<User> {
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
