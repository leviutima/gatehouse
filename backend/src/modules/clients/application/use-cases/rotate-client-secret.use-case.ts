import { Injectable } from '@nestjs/common';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import { PublicClientHasNoSecretError } from '../../domain/errors/public-client-has-no-secret.error.js';
import { ClientRepository } from '../../domain/repositories/client.repository.js';
import { RealmClientFinder } from '../services/realm-client-finder.js';

export interface RotateClientSecretInput {
  realmName: string;
  clientId: string;
}

@Injectable()
export class RotateClientSecretUseCase {
  constructor(
    private readonly finder: RealmClientFinder,
    private readonly clients: ClientRepository,
    private readonly secretGenerator: SecretGenerator,
    private readonly secretHasher: SecretHasher,
  ) {}

  async execute({
    realmName,
    clientId,
  }: RotateClientSecretInput): Promise<string> {
    const { client } = await this.finder.client(realmName, clientId);
    if (!client.isConfidential) {
      throw new PublicClientHasNoSecretError(client.clientId);
    }

    const secret = this.secretGenerator.generate();
    await this.clients.update(client.id, {
      secretHash: this.secretHasher.hash(secret),
    });
    return secret;
  }
}
