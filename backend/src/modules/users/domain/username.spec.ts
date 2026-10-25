import { InvalidUsernameError } from './errors/invalid-username.error.js';
import { assertValidUsername } from './username.js';

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
