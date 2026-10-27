import type { Realm } from '../entities/realm.entity.js';
import type { LoginIdentifier } from '../login-identifier.js';

export interface CreateRealmData {
  name: string;
  displayName: string;
  loginIdentifier: LoginIdentifier;
  passwordMinLength?: number;
  accessTokenLifespan?: number;
}

export abstract class RealmRepository {
  abstract findByName(name: string): Promise<Realm | null>;
  abstract list(): Promise<Realm[]>;
  abstract create(data: CreateRealmData): Promise<Realm>;
}
