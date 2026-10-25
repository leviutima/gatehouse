import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../../../shared/application/crypto/password-hasher.js';
import { TransactionManager } from '../../../../shared/application/persistence/transaction-manager.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import { UserRepository } from '../../../users/domain/repositories/user.repository.js';
import {
  MASTER_REALM_NAME,
  Realm,
} from '../../domain/entities/realm.entity.js';
import { RealmAlreadyExistsError } from '../../domain/errors/realm-already-exists.error.js';
import { LoginIdentifier } from '../../domain/login-identifier.js';
import { RealmRepository } from '../../domain/repositories/realm.repository.js';
import { MasterAdminNotConfiguredError } from '../errors/master-admin-not-configured.error.js';

export interface InitialAdmin {
  username: string;
  email: string;
  password: string;
}

export type BootstrapMasterRealmResult =
  | { status: 'created'; realm: Realm; admin: User }
  | { status: 'already_exists' };

@Injectable()
export class BootstrapMasterRealmUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly transactions: TransactionManager,
  ) {}

  async execute(
    initialAdmin: InitialAdmin | null,
  ): Promise<BootstrapMasterRealmResult> {
    if (await this.realms.findByName(MASTER_REALM_NAME)) {
      return { status: 'already_exists' };
    }
    if (!initialAdmin) {
      throw new MasterAdminNotConfiguredError();
    }

    const passwordHash = await this.passwordHasher.hash(initialAdmin.password);

    try {
      return await this.transactions.run(async () => {
        const realm = await this.realms.create({
          name: MASTER_REALM_NAME,
          displayName: 'Master',
          loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
        });
        const admin = await this.users.create({
          realmId: realm.id,
          username: initialAdmin.username,
          email: initialAdmin.email,
          emailVerified: false,
          passwordHash,
        });
        return { status: 'created', realm, admin };
      });
    } catch (error) {
      if (error instanceof RealmAlreadyExistsError) {
        return { status: 'already_exists' };
      }
      throw error;
    }
  }
}
