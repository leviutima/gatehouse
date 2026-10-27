import { definedFields } from '../../../shared/testing/defined-fields.js';
import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { Realm } from '../domain/entities/realm.entity.js';
import { RealmAlreadyExistsError } from '../domain/errors/realm-already-exists.error.js';
import {
  CreateRealmData,
  RealmRepository,
  UpdateRealmData,
} from '../domain/repositories/realm.repository.js';

export class InMemoryRealmRepository extends RealmRepository {
  readonly realms: Realm[];

  constructor(realms: Realm[] = []) {
    super();
    this.realms = [...realms];
  }

  findByName(name: string): Promise<Realm | null> {
    return Promise.resolve(
      this.realms.find((realm) => realm.name === name) ?? null,
    );
  }

  list(): Promise<Realm[]> {
    return Promise.resolve(
      [...this.realms].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  create(data: CreateRealmData): Promise<Realm> {
    if (this.realms.some((realm) => realm.name === data.name)) {
      return Promise.reject(new RealmAlreadyExistsError(data.name));
    }
    const realm = new Realm({
      id: `realm-${this.realms.length + 1}`,
      enabled: true,
      passwordMinLength: data.passwordMinLength ?? 12,
      accessTokenLifespan: data.accessTokenLifespan ?? 300,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
      name: data.name,
      displayName: data.displayName,
      loginIdentifier: data.loginIdentifier,
    });
    this.realms.push(realm);
    return Promise.resolve(realm);
  }

  update(id: string, data: UpdateRealmData): Promise<Realm> {
    const index = this.realms.findIndex((realm) => realm.id === id);
    const current = this.realms[index];
    const updated = new Realm({
      id: current.id,
      name: current.name,
      displayName: current.displayName,
      enabled: current.enabled,
      loginIdentifier: current.loginIdentifier,
      passwordMinLength: current.passwordMinLength,
      accessTokenLifespan: current.accessTokenLifespan,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      ...definedFields(data),
    });
    this.realms[index] = updated;
    return Promise.resolve(updated);
  }
}
