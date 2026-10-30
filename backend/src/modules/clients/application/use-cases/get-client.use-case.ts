import { Injectable } from '@nestjs/common';
import type { Client } from '../../domain/entities/client.entity.js';
import { RealmClientFinder } from '../services/realm-client-finder.js';

export interface GetClientInput {
  realmName: string;
  clientId: string;
}

@Injectable()
export class GetClientUseCase {
  constructor(private readonly finder: RealmClientFinder) {}

  async execute({ realmName, clientId }: GetClientInput): Promise<Client> {
    const { client } = await this.finder.client(realmName, clientId);
    return client;
  }
}
