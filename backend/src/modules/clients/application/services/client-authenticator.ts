import { Injectable } from '@nestjs/common';
import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import type { Client } from '../../domain/entities/client.entity.js';
import { ClientRepository } from '../../domain/repositories/client.repository.js';

export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
}

@Injectable()
export class ClientAuthenticator {
  constructor(
    private readonly clients: ClientRepository,
    private readonly secretHasher: SecretHasher,
  ) {}

  async authenticate(
    realmId: string,
    credentials: ClientCredentials,
  ): Promise<Client | null> {
    const client = await this.clients.findByClientId(
      realmId,
      credentials.clientId,
    );
    if (
      !client?.enabled ||
      !client.isConfidential ||
      client.secretHash === null ||
      !this.secretHasher.verify(client.secretHash, credentials.clientSecret)
    ) {
      return null;
    }
    return client;
  }
}
