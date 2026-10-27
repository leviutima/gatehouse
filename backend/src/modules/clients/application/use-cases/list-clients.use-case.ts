import { Injectable } from '@nestjs/common';
import type { Client } from '../../domain/entities/client.entity.js';
import { ClientRepository } from '../../domain/repositories/client.repository.js';
import { RealmClientFinder } from '../services/realm-client-finder.js';

@Injectable()
export class ListClientsUseCase {
  constructor(
    private readonly finder: RealmClientFinder,
    private readonly clients: ClientRepository,
  ) {}

  async execute(realmName: string): Promise<Client[]> {
    const realm = await this.finder.realm(realmName);
    return this.clients.list(realm.id);
  }
}
