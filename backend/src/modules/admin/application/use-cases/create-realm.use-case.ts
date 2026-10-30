import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/application/persistence/transaction-manager.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import {
  assertValidRealmSettings,
  DEFAULT_SESSION_IDLE_TIMEOUT,
  DEFAULT_SESSION_MAX_LIFESPAN,
  RealmSettings,
} from '../../../realms/domain/realm-settings.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { AdminRoleProvisioner } from '../../../roles/application/services/admin-role-provisioner.js';
import { SigningKeyProvisioner } from '../../../signing-keys/application/services/signing-key-provisioner.js';
import {
  RegisterUserInput,
  UserRegistrar,
} from '../../../users/application/services/user-registrar.js';
import type { User } from '../../../users/domain/entities/user.entity.js';

export interface CreateRealmInput extends RealmSettings {
  loginIdentifier?: LoginIdentifier;
  admin?: RegisterUserInput;
}

export interface CreateRealmResult {
  realm: Realm;
  admin: User | null;
}

@Injectable()
export class CreateRealmUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly userRegistrar: UserRegistrar,
    private readonly adminRoles: AdminRoleProvisioner,
    private readonly signingKeyProvisioner: SigningKeyProvisioner,
    private readonly transactions: TransactionManager,
  ) {}

  execute(input: CreateRealmInput): Promise<CreateRealmResult> {
    const sessionIdleTimeout =
      input.sessionIdleTimeout ?? DEFAULT_SESSION_IDLE_TIMEOUT;
    const sessionMaxLifespan =
      input.sessionMaxLifespan ?? DEFAULT_SESSION_MAX_LIFESPAN;
    assertValidRealmSettings({
      ...input,
      sessionIdleTimeout,
      sessionMaxLifespan,
    });

    return this.transactions.run(async () => {
      const realm = await this.realms.create({
        name: input.name,
        displayName: input.displayName.trim(),
        loginIdentifier:
          input.loginIdentifier ?? LoginIdentifier.USERNAME_OR_EMAIL,
        passwordMinLength: input.passwordMinLength,
        accessTokenLifespan: input.accessTokenLifespan,
        sessionIdleTimeout,
        sessionMaxLifespan,
      });
      await this.adminRoles.ensureAdminRole(realm.id);
      const admin = input.admin
        ? await this.userRegistrar.register(realm, input.admin)
        : null;
      if (admin) {
        await this.adminRoles.grantAdmin(realm.id, admin.id);
      }
      await this.signingKeyProvisioner.ensureActive(realm.id);
      return { realm, admin };
    });
  }
}
