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
  postLogoutRedirectUris?: string[];
  grantTypes: GrantType[];
}

export interface UpdateClientData {
  name?: string;
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  grantTypes?: GrantType[];
  enabled?: boolean;
  secretHash?: string;
}

export abstract class ClientRepository {
  abstract findByClientId(
    realmId: string,
    clientId: string,
  ): Promise<Client | null>;
  abstract list(realmId: string): Promise<Client[]>;
  abstract create(data: CreateClientData): Promise<Client>;
  abstract update(id: string, data: UpdateClientData): Promise<Client>;
}
