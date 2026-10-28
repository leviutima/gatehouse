import { definedFields } from '../../../shared/testing/defined-fields.js';
import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { Client } from '../domain/entities/client.entity.js';
import { ClientAlreadyExistsError } from '../domain/errors/client-already-exists.error.js';
import {
  ClientRepository,
  CreateClientData,
  UpdateClientData,
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

  list(realmId: string): Promise<Client[]> {
    return Promise.resolve(
      this.clients
        .filter((client) => client.realmId === realmId)
        .sort((a, b) => a.clientId.localeCompare(b.clientId)),
    );
  }

  update(id: string, data: UpdateClientData): Promise<Client> {
    const index = this.clients.findIndex((client) => client.id === id);
    const current = this.clients[index];
    const updated = new Client({
      id: current.id,
      realmId: current.realmId,
      clientId: current.clientId,
      name: current.name,
      type: current.type,
      secretHash: current.secretHash,
      redirectUris: [...current.redirectUris],
      grantTypes: [...current.grantTypes],
      enabled: current.enabled,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      ...definedFields(data),
    });
    this.clients[index] = updated;
    return Promise.resolve(updated);
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
