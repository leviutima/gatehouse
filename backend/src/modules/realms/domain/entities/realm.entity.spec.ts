import { UsernameRequiredError } from '../errors/username-required.error.js';
import { WeakPasswordError } from '../errors/weak-password.error.js';
import { LoginIdentifier } from '../login-identifier.js';
import { Realm, RealmProps } from './realm.entity.js';

function realm(overrides: Partial<RealmProps> = {}): Realm {
  return new Realm({
    id: 'realm-1',
    name: 'shop',
    displayName: 'Shop',
    enabled: true,
    loginIdentifier: LoginIdentifier.USERNAME_OR_EMAIL,
    passwordMinLength: 12,
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

  describe('resolveUsername', () => {
    it.each([LoginIdentifier.USERNAME, LoginIdentifier.USERNAME_OR_EMAIL])(
      'keeps the given username when logging in by %s',
      (loginIdentifier) => {
        expect(
          realm({ loginIdentifier }).resolveUsername({
            username: 'joao',
            email: 'joao@mail.com',
          }),
        ).toBe('joao');
      },
    );

    it.each([LoginIdentifier.USERNAME, LoginIdentifier.USERNAME_OR_EMAIL])(
      'requires a username when logging in by %s',
      (loginIdentifier) => {
        expect(() =>
          realm({ loginIdentifier }).resolveUsername({
            email: 'joao@mail.com',
          }),
        ).toThrow(UsernameRequiredError);
      },
    );

    it('uses the email as username when logging in by EMAIL', () => {
      expect(
        realm({ loginIdentifier: LoginIdentifier.EMAIL }).resolveUsername({
          username: 'ignored',
          email: 'joao@mail.com',
        }),
      ).toBe('joao@mail.com');
    });
  });

  describe('assertPasswordAllowed', () => {
    it('accepts a password at the minimum length', () => {
      expect(() =>
        realm({ passwordMinLength: 12 }).assertPasswordAllowed('a'.repeat(12)),
      ).not.toThrow();
    });

    it('rejects a password below the minimum length', () => {
      expect(() =>
        realm({ passwordMinLength: 12 }).assertPasswordAllowed('a'.repeat(11)),
      ).toThrow(WeakPasswordError);
    });

    it('rejects a password above 256 characters', () => {
      expect(() => realm().assertPasswordAllowed('a'.repeat(257))).toThrow(
        WeakPasswordError,
      );
    });

    it('counts characters, not UTF-16 code units', () => {
      const twelveEmoji = '🔒'.repeat(12);

      expect(twelveEmoji.length).toBe(24);
      expect(() =>
        realm({ passwordMinLength: 13 }).assertPasswordAllowed(twelveEmoji),
      ).toThrow(WeakPasswordError);
    });

    it('does not demand uppercase, digits or symbols', () => {
      expect(() =>
        realm().assertPasswordAllowed('correct horse battery staple'),
      ).not.toThrow();
    });
  });
});
