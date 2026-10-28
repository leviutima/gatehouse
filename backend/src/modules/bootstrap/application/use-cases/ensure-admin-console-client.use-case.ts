import { Injectable } from '@nestjs/common';
import { ClientType } from '../../../clients/domain/client-type.js';
import { Client } from '../../../clients/domain/entities/client.entity.js';
import { ClientAlreadyExistsError } from '../../../clients/domain/errors/client-already-exists.error.js';
import { GrantType } from '../../../clients/domain/grant-type.js';
import {
  ClientRepository,
  CreateClientData,
} from '../../../clients/domain/repositories/client.repository.js';
import { MASTER_REALM_NAME } from '../../../realms/domain/entities/realm.entity.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';

export const ADMIN_CONSOLE_CLIENT_ID = 'admin-console';

export type EnsureAdminConsoleResult = 'created' | 'already_exists';

@Injectable()
export class EnsureAdminConsoleClientUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly clients: ClientRepository,
  ) {}

  async execute(consoleUrl: string): Promise<EnsureAdminConsoleResult> {
    const master = await this.realms.findByName(MASTER_REALM_NAME);
    if (!master) {
      return 'already_exists';
    }
    if (await this.clients.findByClientId(master.id, ADMIN_CONSOLE_CLIENT_ID)) {
      return 'already_exists';
    }

    const base = consoleUrl.replace(/\/+$/, '');
    const data: CreateClientData = {
      realmId: master.id,
      clientId: ADMIN_CONSOLE_CLIENT_ID,
      name: 'Admin console',
      type: ClientType.PUBLIC,
      secretHash: null,
      redirectUris: [`${base}/callback`],
      postLogoutRedirectUris: [`${base}/`],
      webOrigins: [new URL(base).origin],
      grantTypes: [GrantType.AUTHORIZATION_CODE, GrantType.REFRESH_TOKEN],
    };
    Client.assertValid(data);

    try {
      await this.clients.create(data);
      return 'created';
    } catch (error) {
      if (error instanceof ClientAlreadyExistsError) {
        return 'already_exists';
      }
      throw error;
    }
  }
}
