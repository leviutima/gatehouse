import type { ClientType } from '../client-type.js';
import type { Client } from '../entities/client.entity.js';
import type { GrantType } from '../grant-type.js';

export interface CreateClientData {
  realmId: string;
  clientId: string;
  name: string;
  type: ClientType;
  secretHash: string | null;
  redirectUris: string[];
  grantTypes: GrantType[];
}

export abstract class ClientRepository {
  abstract findByClientId(
    realmId: string,
    clientId: string,
  ): Promise<Client | null>;
  abstract create(data: CreateClientData): Promise<Client>;
}
