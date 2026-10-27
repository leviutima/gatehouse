import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/application/persistence/transaction-manager.js';
import { SigningKeyProvisioner } from '../../../signing-keys/application/services/signing-key-provisioner.js';
import {
  RegisterUserInput,
  UserRegistrar,
} from '../../../users/application/services/user-registrar.js';
import type { User } from '../../../users/domain/entities/user.entity.js';
import {
  MASTER_REALM_NAME,
  Realm,
} from '../../../realms/domain/entities/realm.entity.js';
import { RealmAlreadyExistsError } from '../../../realms/domain/errors/realm-already-exists.error.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { MasterAdminNotConfiguredError } from '../errors/master-admin-not-configured.error.js';

export type InitialAdmin = Required<RegisterUserInput>;

export type BootstrapMasterRealmResult =
  | { status: 'created'; realm: Realm; admin: User }
  | { status: 'already_exists' };

@Injectable()
export class BootstrapMasterRealmUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly userRegistrar: UserRegistrar,
    private readonly signingKeyProvisioner: SigningKeyProvisioner,
    private readonly transactions: TransactionManager,
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

    try {
      return await this.transactions.run(async () => {
        const realm = await this.realms.create({
          name: MASTER_REALM_NAME,
          displayName: 'Master',
          loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
        });
        const admin = await this.userRegistrar.register(realm, initialAdmin);
        await this.signingKeyProvisioner.ensureActive(realm.id);
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
      await this.signingKeyProvisioner.ensureActive(master.id);
    }
    return { status: 'already_exists' };
  }
}
