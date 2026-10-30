import { LoginIdentifier } from '../login-identifier.js';
import { PasswordPolicy } from '../password-policy.js';
import { Realm, RealmProps } from './realm.entity.js';

function realm(overrides: Partial<RealmProps> = {}): Realm {
  return new Realm({
    id: 'realm-1',
    name: 'shop',
    displayName: 'Shop',
    enabled: true,
    loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
    passwordMinLength: 12,
    accessTokenLifespan: 300,
    sessionIdleTimeout: 1800,
    sessionMaxLifespan: 36000,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

describe('Realm', () => {
  it('knows whether it is the master realm', () => {
    expect(realm({ name: 'master' }).isMaster).toBe(true);
    expect(realm({ name: 'shop' }).isMaster).toBe(false);
  });

  it('knows whether it uses the email as username', () => {
    expect(
      realm({ loginIdentifier: LoginIdentifier.EMAIL }).usesEmailAsUsername,
    ).toBe(true);
    expect(
      realm({ loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL })
        .usesEmailAsUsername,
    ).toBe(false);
  });

  it('exposes its password policy', () => {
    expect(realm({ passwordMinLength: 16 }).passwordPolicy).toEqual(
      new PasswordPolicy(16, 256),
    );
  });
});
