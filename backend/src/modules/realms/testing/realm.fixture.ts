import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { Realm, RealmProps } from '../domain/entities/realm.entity.js';
import { LoginIdentifier } from '../domain/login-identifier.js';

export function aRealm(overrides: Partial<RealmProps> = {}): Realm {
  const name = overrides.name ?? 'shop';
  return new Realm({
    id: `${name}-id`,
    name,
    displayName: name,
    enabled: true,
    loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
    passwordMinLength: 12,
    accessTokenLifespan: 300,
    sessionIdleTimeout: 1800,
    sessionMaxLifespan: 36000,
    createdAt: TEST_NOW,
    updatedAt: TEST_NOW,
    ...overrides,
  });
}
