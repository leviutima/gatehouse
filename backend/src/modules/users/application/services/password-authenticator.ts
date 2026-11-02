import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../../../shared/application/crypto/password-hasher.js';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { PASSWORD_MAX_LENGTH } from '../../../realms/domain/password-policy.js';
import type { User } from '../../domain/entities/user.entity.js';
import { UserRepository } from '../../domain/repositories/user.repository.js';

export interface PasswordCredentials {
  identifier: string;
  password: string;
}

@Injectable()
export class PasswordAuthenticator {
  private decoyHash: Promise<string> | null = null;

  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly secretGenerator: SecretGenerator,
  ) {}

  async authenticate(
    realm: Realm,
    { identifier, password }: PasswordCredentials,
  ): Promise<User | null> {
    if (Array.from(password).length > PASSWORD_MAX_LENGTH) {
      return null;
    }

    const user = await this.findUser(realm, identifier.trim());
    if (!user) {
      await this.passwordHasher.verify(await this.decoy(), password);
      return null;
    }

    const valid = await this.passwordHasher.verify(user.passwordHash, password);
    if (!valid || !user.enabled) {
      return null;
    }

    if (this.passwordHasher.needsRehash(user.passwordHash)) {
      await this.users.update(user.id, {
        passwordHash: await this.passwordHasher.hash(password),
      });
    }
    return user;
  }

  private findUser(realm: Realm, identifier: string): Promise<User | null> {
    const byEmail =
      realm.loginIdentifier === LoginIdentifier.EMAIL ||
      (realm.loginIdentifier === LoginIdentifier.USERNAME_OR_EMAIL &&
        identifier.includes('@'));
    return byEmail
      ? this.users.findByEmail(realm.id, identifier)
      : this.users.findByUsername(realm.id, identifier);
  }

  private decoy(): Promise<string> {
    this.decoyHash ??= this.passwordHasher.hash(
      this.secretGenerator.generate(),
    );
    return this.decoyHash;
  }
}
