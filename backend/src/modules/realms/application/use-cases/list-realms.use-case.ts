import { Injectable } from '@nestjs/common';
import type { Realm } from '../../domain/entities/realm.entity.js';
import { RealmRepository } from '../../domain/repositories/realm.repository.js';

@Injectable()
export class ListRealmsUseCase {
  constructor(private readonly realms: RealmRepository) {}

  execute(): Promise<Realm[]> {
    return this.realms.list();
  }
}
