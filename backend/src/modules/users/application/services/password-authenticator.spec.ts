import { FakePasswordHasher } from '../../../../shared/testing/fake-password-hasher.js';
import { SequentialSecretGenerator } from '../../../../shared/testing/sequential-secret-generator.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { InMemoryUserRepository } from '../../testing/in-memory-user.repository.js';
import { PasswordAuthenticator } from './password-authenticator.js';

describe('PasswordAuthenticator', () => {
  const shop = aRealm({ name: 'shop' });
  const newsletter = aRealm({
    name: 'newsletter',
    loginIdentifier: LoginIdentifier.EMAIL,
  });
  const usernameOnly = aRealm({
    name: 'legacy',
    loginIdentifier: LoginIdentifier.USERNAME,
  });

  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let authenticator: PasswordAuthenticator;

  const addUser = (realmId: string, username: string, email: string) =>
    users.create({
      realmId,
      username,
      email,
      emailVerified: false,
      passwordHash: 'hashed:right-password',
    });

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    authenticator = new PasswordAuthenticator(
      users,
      hasher,
      new SequentialSecretGenerator(),
    );
    await addUser(shop.id, 'ana', 'ana@shop.example');
    await addUser(newsletter.id, 'bia@news.example', 'bia@news.example');
    await addUser(usernameOnly.id, 'carla', 'carla@legacy.example');
  });

  it.each([
    ['the username', shop, 'ana'],
    ['the email', shop, 'ana@shop.example'],
    ['a differently cased username', shop, 'ANA'],
    ['the identifier with spaces around it', shop, '  ana  '],
    ['the email in an EMAIL realm', newsletter, 'bia@news.example'],
    ['the username in a USERNAME realm', usernameOnly, 'carla'],
  ])('signs in with %s', async (_case, realm, identifier) => {
    await expect(
      authenticator.authenticate(realm, {
        identifier,
        password: 'right-password',
      }),
    ).resolves.not.toBeNull();
  });

  it('does not look emails up in a USERNAME realm', async () => {
    await expect(
      authenticator.authenticate(usernameOnly, {
        identifier: 'carla@legacy.example',
        password: 'right-password',
      }),
    ).resolves.toBeNull();
  });

  it('rejects a wrong password', async () => {
    await expect(
      authenticator.authenticate(shop, {
        identifier: 'ana',
        password: 'wrong-password',
      }),
    ).resolves.toBeNull();
  });

  it('rejects a disabled user even with the right password', async () => {
    await users.update(users.users[0].id, { enabled: false });

    await expect(
      authenticator.authenticate(shop, {
        identifier: 'ana',
        password: 'right-password',
      }),
    ).resolves.toBeNull();
  });

  it('still checks a password when the user does not exist', async () => {
    const verify = vi.spyOn(hasher, 'verify');

    await expect(
      authenticator.authenticate(shop, {
        identifier: 'ghost',
        password: 'whatever',
      }),
    ).resolves.toBeNull();
    expect(verify).toHaveBeenCalledOnce();
  });

  it('rejects an oversized password before hashing it', async () => {
    const verify = vi.spyOn(hasher, 'verify');

    await expect(
      authenticator.authenticate(shop, {
        identifier: 'ana',
        password: 'a'.repeat(257),
      }),
    ).resolves.toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it('rehashes the password when its hash is outdated', async () => {
    vi.spyOn(hasher, 'needsRehash').mockReturnValueOnce(true);
    hasher.hash.mockResolvedValueOnce('hashed-again');

    await authenticator.authenticate(shop, {
      identifier: 'ana',
      password: 'right-password',
    });

    expect(users.users[0].passwordHash).toBe('hashed-again');
  });
});
