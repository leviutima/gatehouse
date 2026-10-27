import { Injectable } from '@nestjs/common';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import type { Client } from '../../domain/entities/client.entity.js';
import { ClientNotFoundError } from '../../domain/errors/client-not-found.error.js';
import { ClientRepository } from '../../domain/repositories/client.repository.js';

export interface RealmClient {
  realm: Realm;
  client: Client;
}

@Injectable()
export class RealmClientFinder {
  constructor(
    private readonly realms: RealmRepository,
    private readonly clients: ClientRepository,
  ) {}

  async realm(name: string): Promise<Realm> {
    const realm = await this.realms.findByName(name);
    if (!realm) {
      throw new RealmNotFoundError(name);
    }
    return realm;
  }

  async client(realmName: string, clientId: string): Promise<RealmClient> {
    const realm = await this.realm(realmName);
    const client = await this.clients.findByClientId(realm.id, clientId);
    if (!client) {
      throw new ClientNotFoundError(clientId);
    }
    return { realm, client };
  }
}
