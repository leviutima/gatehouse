import { PasswordHasher } from '../../../../shared/application/crypto/password-hasher.js';
import { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { RealmNotFoundError } from '../../../realms/domain/errors/realm-not-found.error.js';
import { UsernameRequiredError } from '../../domain/errors/username-required.error.js';
import { WeakPasswordError } from '../../../realms/domain/errors/weak-password.error.js';
import {
  LoginIdentifier,
  type LoginIdentifier as LoginIdentifierType,
} from '../../../realms/domain/login-identifier.js';
import { RealmRepository } from '../../../realms/domain/repositories/realm.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { InvalidUsernameError } from '../../domain/errors/invalid-username.error.js';
import {
  CreateUserData,
  UserRepository,
} from '../../domain/repositories/user.repository.js';
import { CreateUserUseCase } from './create-user.use-case.js';

const now = new Date('2026-10-24T00:00:00Z');

function realm(name: string, loginIdentifier: LoginIdentifierType): Realm {
  return new Realm({
    id: `${name}-id`,
    name,
    displayName: name,
    enabled: true,
    loginIdentifier,
    passwordMinLength: 12,
    createdAt: now,
    updatedAt: now,
  });
}

class InMemoryRealmRepository extends RealmRepository {
  constructor(private readonly realms: Realm[]) {
    super();
  }

  findByName(name: string): Promise<Realm | null> {
    return Promise.resolve(this.realms.find((r) => r.name === name) ?? null);
  }

  create(): Promise<Realm> {
    return Promise.reject(new Error('not used'));
  }
}

class InMemoryUserRepository extends UserRepository {
  readonly users: User[] = [];

  create(data: CreateUserData): Promise<User> {
    const user = new User({
      id: `user-${this.users.length + 1}`,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      ...data,
    });
    this.users.push(user);
    return Promise.resolve(user);
  }
}

class FakePasswordHasher extends PasswordHasher {
  readonly hash = vi.fn((password: string) =>
    Promise.resolve(`hashed:${password}`),
  );

  verify(): Promise<boolean> {
    return Promise.resolve(false);
  }

  needsRehash(): boolean {
    return false;
  }
}

describe('CreateUserUseCase', () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    useCase = new CreateUserUseCase(
      new InMemoryRealmRepository([
        realm('shop', LoginIdentifier.USERNAME_OR_EMAIL),
        realm('newsletter', LoginIdentifier.EMAIL),
      ]),
      users,
      hasher,
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
