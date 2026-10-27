import { Realm } from '../../realms/domain/entities/realm.entity.js';
import {
  LoginIdentifier,
  type LoginIdentifier as LoginIdentifierType,
} from '../../realms/domain/login-identifier.js';
import { InvalidUsernameError } from './errors/invalid-username.error.js';
import { UsernameRequiredError } from './errors/username-required.error.js';
import { assertValidUsername, resolveUsername } from './username.js';

function realm(loginIdentifier: LoginIdentifierType): Realm {
  return new Realm({
    id: 'realm-1',
    name: 'shop',
    displayName: 'Shop',
    enabled: true,
    loginIdentifier,
    passwordMinLength: 12,
    accessTokenLifespan: 300,
    sessionIdleTimeout: 1800,
    sessionMaxLifespan: 36000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('assertValidUsername', () => {
  it.each(['joao', 'joao.silva', 'joao_silva-2', 'J0A', 'a'.repeat(64)])(
    'accepts %s',
    (username) => {
      expect(() => assertValidUsername(username)).not.toThrow();
    },
  );

  it.each([
    ['too short', 'jo'],
    ['too long', 'a'.repeat(65)],
    ['with a space', 'joao silva'],
    ['with an @', 'joao@mail.com'],
    ['with an accent', 'joão'],
    ['empty', ''],
  ])('rejects a username %s', (_case, username) => {
    expect(() => assertValidUsername(username)).toThrow(InvalidUsernameError);
  });
});

describe('resolveUsername', () => {
  it.each([LoginIdentifier.USERNAME, LoginIdentifier.USERNAME_OR_EMAIL])(
    'keeps the given username when logging in by %s',
    (loginIdentifier) => {
      expect(
        resolveUsername(realm(loginIdentifier), {
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
        resolveUsername(realm(loginIdentifier), { email: 'joao@mail.com' }),
      ).toThrow(UsernameRequiredError);
    },
  );

  it('rejects a malformed username outside EMAIL realms', () => {
    expect(() =>
      resolveUsername(realm(LoginIdentifier.USERNAME_OR_EMAIL), {
        username: 'joao@mail.com',
        email: 'joao@mail.com',
      }),
    ).toThrow(InvalidUsernameError);
  });

  it('uses the email as username when logging in by EMAIL, skipping the username format', () => {
    expect(
      resolveUsername(realm(LoginIdentifier.EMAIL), {
        username: 'ignored',
        email: 'joao@mail.com',
      }),
    ).toBe('joao@mail.com');
  });
});
