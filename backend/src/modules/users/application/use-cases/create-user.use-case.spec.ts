import { FakePasswordHasher } from '../../../../shared/testing/fake-password-hasher.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { WeakPasswordError } from '../../../realms/domain/errors/weak-password.error.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';
import { InMemoryRealmRepository } from '../../../realms/testing/in-memory-realm.repository.js';
import { aRealm } from '../../../realms/testing/realm.fixture.js';
import { InvalidUsernameError } from '../../domain/errors/invalid-username.error.js';
import { UsernameRequiredError } from '../../domain/errors/username-required.error.js';
import { InMemoryUserRepository } from '../../testing/in-memory-user.repository.js';
import { UserRegistrar } from '../services/user-registrar.js';
import { CreateUserUseCase } from './create-user.use-case.js';

describe('CreateUserUseCase', () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    useCase = new CreateUserUseCase(
      new InMemoryRealmRepository([
        aRealm({ name: 'shop' }),
        aRealm({
          name: 'newsletter',
          loginIdentifier: LoginIdentifier.EMAIL,
        }),
      ]),
      new UserRegistrar(users, hasher),
    );
  });

  const valid = {
    realmName: 'shop',
    username: 'joao',
    email: 'joao@mail.com',
    password: 'a-long-enough-password',
  };

  it('creates the user in the realm with a hashed password', async () => {
    const user = await useCase.execute(valid);

    expect(user).toMatchObject({
      realmId: 'shop-id',
      username: 'joao',
      email: 'joao@mail.com',
      emailVerified: false,
      passwordHash: 'hashed:a-long-enough-password',
    });
  });

  it('uses the email as username in an EMAIL realm', async () => {
    const user = await useCase.execute({
      realmName: 'newsletter',
      email: 'joao@mail.com',
      password: 'a-long-enough-password',
    });

    expect(user.username).toBe('joao@mail.com');
  });

  it('fails for an unknown realm', async () => {
    await expect(
      useCase.execute({ ...valid, realmName: 'missing' }),
    ).rejects.toBeInstanceOf(RealmNotFoundError);
  });

  it('requires a username outside EMAIL realms', async () => {
    await expect(
      useCase.execute({ ...valid, username: undefined }),
    ).rejects.toBeInstanceOf(UsernameRequiredError);
  });

  it('rejects a malformed username', async () => {
    await expect(
      useCase.execute({ ...valid, username: 'joao@mail.com' }),
    ).rejects.toBeInstanceOf(InvalidUsernameError);
  });

  it('rejects a weak password before hashing it', async () => {
    await expect(
      useCase.execute({ ...valid, password: 'short' }),
    ).rejects.toBeInstanceOf(WeakPasswordError);
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(users.users).toHaveLength(0);
  });
});
