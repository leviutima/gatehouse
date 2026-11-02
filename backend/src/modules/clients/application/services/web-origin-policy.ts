import { Injectable } from '@nestjs/common';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { ClientRepository } from '../../domain/repositories/client.repository.js';

@Injectable()
export class WebOriginPolicy {
  constructor(
    private readonly realms: RealmRepository,
    private readonly clients: ClientRepository,
  ) {}

  async isAllowed(realmName: string, origin: string): Promise<boolean> {
    const realm = await this.realms.findByName(realmName);
    if (!realm?.enabled) {
      return false;
    }
    const clients = await this.clients.list(realm.id);
    return clients.some(
      (client) => client.enabled && client.allowsWebOrigin(origin),
    );
  }
}
