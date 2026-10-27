import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { SigningKey } from '../domain/entities/signing-key.entity.js';
import { ActiveSigningKeyAlreadyExistsError } from '../domain/errors/active-signing-key-already-exists.error.js';
import {
  CreateSigningKeyData,
  SigningKeyRepository,
} from '../domain/repositories/signing-key.repository.js';
import { SigningKeyStatus } from '../domain/signing-key-status.js';

export class InMemorySigningKeyRepository extends SigningKeyRepository {
  readonly keys: SigningKey[];

  constructor(keys: SigningKey[] = []) {
    super();
    this.keys = [...keys];
  }

  findActive(realmId: string): Promise<SigningKey | null> {
    return Promise.resolve(
      this.keys.find((key) => key.realmId === realmId && key.isActive) ?? null,
    );
  }

  findPublished(realmId: string): Promise<SigningKey[]> {
    return Promise.resolve(this.keys.filter((key) => key.realmId === realmId));
  }

  create(data: CreateSigningKeyData): Promise<SigningKey> {
    const activeExists = this.keys.some(
      (key) => key.realmId === data.realmId && key.isActive,
    );
    if (data.status === SigningKeyStatus.ACTIVE && activeExists) {
      return Promise.reject(new ActiveSigningKeyAlreadyExistsError());
    }
    const key = new SigningKey({
      id: `key-${this.keys.length + 1}`,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
      ...data,
    });
    this.keys.push(key);
    return Promise.resolve(key);
  }
}
