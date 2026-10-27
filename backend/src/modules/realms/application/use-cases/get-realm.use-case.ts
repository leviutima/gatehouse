import { Injectable } from '@nestjs/common';
import type { Realm } from '../../domain/entities/realm.entity.js';
import { RealmNotFoundError } from '../../domain/errors/realm-not-found.error.js';
import { RealmRepository } from '../../domain/repositories/realm.repository.js';

@Injectable()
export class GetRealmUseCase {
  constructor(private readonly realms: RealmRepository) {}

  async execute(name: string): Promise<Realm> {
    const realm = await this.realms.findByName(name);
    if (!realm) {
      throw new RealmNotFoundError(name);
    }
    return realm;
  }
}
