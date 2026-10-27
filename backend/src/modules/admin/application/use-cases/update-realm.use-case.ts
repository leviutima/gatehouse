import { Injectable } from '@nestjs/common';
import type { Principal } from '../../../../shared/application/auth/principal.js';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { MasterRealmCannotBeDisabledError } from '../../../realms/domain/errors/master-realm-cannot-be-disabled.error.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { assertValidRealmSettings } from '../../../realms/domain/realm-settings.js';
import {
  RealmRepository,
  UpdateRealmData,
} from '../../../realms/domain/repositories/realm.repository.js';
import { AdminAuthorizer } from '../../../roles/application/services/admin-authorizer.js';
import { RealmStatusRequiresGlobalAdminError } from '../errors/realm-status-requires-global-admin.error.js';

export interface UpdateRealmInput {
  actor: Principal;
  realmName: string;
  changes: UpdateRealmData;
}

@Injectable()
export class UpdateRealmUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly authorizer: AdminAuthorizer,
  ) {}

  async execute({
    actor,
    realmName,
    changes,
  }: UpdateRealmInput): Promise<Realm> {
    const realm = await this.realms.findByName(realmName);
    if (!realm) {
      throw new RealmNotFoundError(realmName);
    }

    if (changes.enabled !== undefined && changes.enabled !== realm.enabled) {
      if (!(await this.authorizer.isGlobalAdmin(actor))) {
        throw new RealmStatusRequiresGlobalAdminError();
      }
      if (realm.isMaster) {
        throw new MasterRealmCannotBeDisabledError();
      }
    }

    const displayName = changes.displayName?.trim();
    assertValidRealmSettings({
      name: realm.name,
      displayName: displayName ?? realm.displayName,
      passwordMinLength: changes.passwordMinLength,
      accessTokenLifespan: changes.accessTokenLifespan,
    });

    return this.realms.update(realm.id, { ...changes, displayName });
  }
}
