import { Injectable } from '@nestjs/common';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import {
  assertValidClientId,
  assertValidClientName,
} from '../../domain/client-identity.js';
import { ClientType } from '../../domain/client-type.js';
import { Client } from '../../domain/entities/client.entity.js';
import type { GrantType } from '../../domain/grant-type.js';
import {
  ClientRepository,
  CreateClientData,
} from '../../domain/repositories/client.repository.js';

export interface CreateClientInput {
  realmName: string;
  clientId: string;
  name: string;
  type: ClientType;
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
  webOrigins?: string[];
  grantTypes: GrantType[];
}

export interface CreateClientResult {
  client: Client;
  secret: string | null;
}

@Injectable()
export class CreateClientUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly clients: ClientRepository,
    private readonly secretGenerator: SecretGenerator,
    private readonly secretHasher: SecretHasher,
  ) {}

  async execute(input: CreateClientInput): Promise<CreateClientResult> {
    assertValidClientId(input.clientId);
    assertValidClientName(input.name);
    const realm = await this.realms.findByName(input.realmName);
    if (!realm) {
      throw new RealmNotFoundError(input.realmName);
    }

    const secret =
      input.type === ClientType.CONFIDENTIAL
        ? this.secretGenerator.generate()
        : null;

    const data: CreateClientData = {
      realmId: realm.id,
      clientId: input.clientId,
      name: input.name.trim(),
      type: input.type,
      secretHash: secret === null ? null : this.secretHasher.hash(secret),
      redirectUris: input.redirectUris,
      postLogoutRedirectUris: input.postLogoutRedirectUris ?? [],
      webOrigins: input.webOrigins ?? [],
      grantTypes: input.grantTypes,
    };
    Client.assertValid(data);

    const client = await this.clients.create(data);
    return { client, secret };
  }
}
