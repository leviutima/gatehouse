import type { Realm } from '../entities/realm.entity.js';
import type { LoginIdentifier } from '../login-identifier.js';

export interface CreateRealmData {
  name: string;
  displayName: string;
  loginIdentifier: LoginIdentifier;
}

export abstract class RealmRepository {
  abstract findByName(name: string): Promise<Realm | null>;
  abstract create(data: CreateRealmData): Promise<Realm>;
}
