import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/application/persistence/transaction-manager.js';
import { AdminRoleProvisioner } from '../../../roles/application/services/admin-role-provisioner.js';
import { SigningKeyProvisioner } from '../../../signing-keys/application/services/signing-key-provisioner.js';
import {
  RegisterUserInput,
  UserRegistrar,
} from '../../../users/application/services/user-registrar.js';
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

export type InitialAdmin = Required<RegisterUserInput>;

export type BootstrapMasterRealmResult =
  | { status: 'created'; realm: Realm; admin: User }
  | { status: 'admin_recovered'; admin: User }
  | { status: 'already_exists' };

@Injectable()
export class BootstrapMasterRealmUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly userRegistrar: UserRegistrar,
    private readonly users: UserRepository,
    private readonly signingKeyProvisioner: SigningKeyProvisioner,
    private readonly adminRoles: AdminRoleProvisioner,
    private readonly transactions: TransactionManager,
  ) {}

  async execute(
    initialAdmin: InitialAdmin | null,
  ): Promise<BootstrapMasterRealmResult> {
    const master = await this.realms.findByName(MASTER_REALM_NAME);
    if (master) {
      return this.alreadyExists(master, initialAdmin);
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
        await this.adminRoles.grantAdmin(realm.id, admin.id);
        await this.signingKeyProvisioner.ensureActive(realm.id);
        return { status: 'created', realm, admin };
      });
    } catch (error) {
      if (error instanceof RealmAlreadyExistsError) {
        return this.alreadyExists(
          await this.realms.findByName(MASTER_REALM_NAME),
          initialAdmin,
        );
      }
      throw error;
    }
  }

  private async alreadyExists(
    master: Realm | null,
    initialAdmin: InitialAdmin | null,
  ): Promise<BootstrapMasterRealmResult> {
    if (!master) {
      return { status: 'already_exists' };
    }
    await this.signingKeyProvisioner.ensureActive(master.id);
    const recovered = await this.recoverAdmin(master, initialAdmin);
    return recovered
      ? { status: 'admin_recovered', admin: recovered }
      : { status: 'already_exists' };
  }

  private async recoverAdmin(
    master: Realm,
    initialAdmin: InitialAdmin | null,
  ): Promise<User | null> {
    if (!initialAdmin || (await this.adminRoles.hasAnyAdmin(master.id))) {
      return null;
    }
    const user = await this.users.findByUsername(
      master.id,
      initialAdmin.username,
    );
    if (!user) {
      return null;
    }
    await this.adminRoles.grantAdmin(master.id, user.id);
    return user;
  }
}
