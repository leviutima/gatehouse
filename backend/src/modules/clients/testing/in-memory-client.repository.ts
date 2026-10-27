import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { Client } from '../domain/entities/client.entity.js';
import { ClientAlreadyExistsError } from '../domain/errors/client-already-exists.error.js';
import {
  ClientRepository,
  CreateClientData,
} from '../domain/repositories/client.repository.js';

export class InMemoryClientRepository extends ClientRepository {
  readonly clients: Client[];

  constructor(clients: Client[] = []) {
    super();
    this.clients = [...clients];
  }

  findByClientId(realmId: string, clientId: string): Promise<Client | null> {
    return Promise.resolve(
      this.clients.find(
        (client) => client.realmId === realmId && client.clientId === clientId,
      ) ?? null,
    );
  }

  create(data: CreateClientData): Promise<Client> {
    const taken = this.clients.some(
      (client) =>
        client.realmId === data.realmId && client.clientId === data.clientId,
    );
    if (taken) {
      return Promise.reject(new ClientAlreadyExistsError(data.clientId));
    }
    const client = new Client({
      id: `client-${this.clients.length + 1}`,
      enabled: true,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
      ...data,
    });
    this.clients.push(client);
    return Promise.resolve(client);
  }
}
