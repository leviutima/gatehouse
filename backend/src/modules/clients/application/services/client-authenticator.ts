import { Injectable } from '@nestjs/common';
import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import type { Client } from '../../domain/entities/client.entity.js';
import { ClientRepository } from '../../domain/repositories/client.repository.js';

export interface ClientCredentials {
  clientId: string;
  clientSecret: string | null;
}

@Injectable()
export class ClientAuthenticator {
  constructor(
    private readonly clients: ClientRepository,
    private readonly secretHasher: SecretHasher,
  ) {}

  async authenticate(
    realmId: string,
    { clientId, clientSecret }: ClientCredentials,
  ): Promise<Client | null> {
    const client = await this.clients.findByClientId(realmId, clientId);
    if (!client?.enabled) {
      return null;
    }
    if (!client.isConfidential) {
      return clientSecret === null ? client : null;
    }
    if (
      clientSecret === null ||
      client.secretHash === null ||
      !this.secretHasher.verify(client.secretHash, clientSecret)
    ) {
      return null;
    }
    return client;
  }
}
