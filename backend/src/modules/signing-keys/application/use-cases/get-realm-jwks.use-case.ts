import { Injectable } from '@nestjs/common';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import type { PublishedJwk } from '../../domain/jwk.js';
import { SigningKeyRepository } from '../../domain/repositories/signing-key.repository.js';

@Injectable()
export class GetRealmJwksUseCase {
  constructor(
    private readonly realms: RealmRepository,
    private readonly keys: SigningKeyRepository,
  ) {}

  async execute(realmName: string): Promise<PublishedJwk[]> {
    const realm = await this.realms.findByName(realmName);
    if (!realm) {
      throw new RealmNotFoundError(realmName);
    }
    const keys = await this.keys.findPublished(realm.id);
    return keys.map((key) => key.toPublishedJwk());
  }
}
