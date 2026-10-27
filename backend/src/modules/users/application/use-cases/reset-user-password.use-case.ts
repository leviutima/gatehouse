import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../../../shared/application/crypto/password-hasher.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { UserRepository } from '../../domain/repositories/user.repository.js';

export interface ResetUserPasswordInput {
  realmName: string;
  userId: string;
  password: string;
}

@Injectable()
export class ResetUserPasswordUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute({
    realmName,
    userId,
    password,
  }: ResetUserPasswordInput): Promise<void> {
    const realm = await this.realms.findByName(realmName);
    if (!realm) {
      throw new RealmNotFoundError(realmName);
    }
    const user = await this.users.findById(realm.id, userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    realm.passwordPolicy.assertAllowed(password);
    await this.users.update(user.id, {
      passwordHash: await this.passwordHasher.hash(password),
    });
  }
}
