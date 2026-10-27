import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../../../shared/application/crypto/password-hasher.js';
import { TransactionManager } from '../../../../shared/application/persistence/transaction-manager.js';
import { EnsureActiveSigningKeyUseCase } from '../../../signing-keys/application/use-cases/ensure-active-signing-key.use-case.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import { UserRepository } from '../../../users/domain/repositories/user.repository.js';
import {
  MASTER_REALM_NAME,
  Realm,
} from '../../../realms/domain/entities/realm.entity.js';
import { RealmAlreadyExistsError } from '../../../realms/domain/errors/realm-already-exists.error.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
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
    private readonly ensureActiveSigningKey: EnsureActiveSigningKeyUseCase,
  ) {}

  async execute(
    initialAdmin: InitialAdmin | null,
  ): Promise<BootstrapMasterRealmResult> {
    const master = await this.realms.findByName(MASTER_REALM_NAME);
    if (master) {
      return this.alreadyExists(master);
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
        await this.ensureActiveSigningKey.execute(realm.id);
        return { status: 'created', realm, admin };
      });
    } catch (error) {
      if (error instanceof RealmAlreadyExistsError) {
        return this.alreadyExists(
          await this.realms.findByName(MASTER_REALM_NAME),
        );
      }
      throw error;
    }
  }

  private async alreadyExists(
    master: Realm | null,
  ): Promise<BootstrapMasterRealmResult> {
    if (master) {
      await this.ensureActiveSigningKey.execute(master.id);
    }
    return { status: 'already_exists' };
  }
}
