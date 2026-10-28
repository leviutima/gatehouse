import { Injectable } from '@nestjs/common';
import { assertValidClientName } from '../../domain/client-identity.js';
import { Client } from '../../domain/entities/client.entity.js';
import type { GrantType } from '../../domain/grant-type.js';
import { ClientRepository } from '../../domain/repositories/client.repository.js';
import { RealmClientFinder } from '../services/realm-client-finder.js';

export interface UpdateClientChanges {
  name?: string;
  redirectUris?: string[];
  postLogoutRedirectUris?: string[];
  grantTypes?: GrantType[];
  enabled?: boolean;
}

export interface UpdateClientInput {
  realmName: string;
  clientId: string;
  changes: UpdateClientChanges;
}

@Injectable()
export class UpdateClientUseCase {
  constructor(
    private readonly finder: RealmClientFinder,
    private readonly clients: ClientRepository,
  ) {}

  async execute({
    realmName,
    clientId,
    changes,
  }: UpdateClientInput): Promise<Client> {
    const { client } = await this.finder.client(realmName, clientId);

    const name = changes.name?.trim();
    if (changes.name !== undefined) {
      assertValidClientName(changes.name);
    }
    Client.assertValid({
      type: client.type,
      secretHash: client.secretHash,
      redirectUris: changes.redirectUris ?? [...client.redirectUris],
      postLogoutRedirectUris: changes.postLogoutRedirectUris ?? [
        ...client.postLogoutRedirectUris,
      ],
      grantTypes: changes.grantTypes ?? [...client.grantTypes],
    });

    return this.clients.update(client.id, { ...changes, name });
  }
}
