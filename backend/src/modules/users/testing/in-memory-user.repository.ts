import { definedFields } from '../../../shared/testing/defined-fields.js';
import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { User } from '../domain/entities/user.entity.js';
import { UserAlreadyExistsError } from '../domain/errors/user-already-exists.error.js';
import {
  CreateUserData,
  Page,
  UpdateUserData,
  UserRepository,
} from '../domain/repositories/user.repository.js';

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export class InMemoryUserRepository extends UserRepository {
  readonly users: User[];

  constructor(users: User[] = []) {
    super();
    this.users = [...users];
  }

  findById(realmId: string, id: string): Promise<User | null> {
    return Promise.resolve(
      this.users.find((user) => user.realmId === realmId && user.id === id) ??
        null,
    );
  }

  findByEmail(realmId: string, email: string): Promise<User | null> {
    return Promise.resolve(
      this.users.find(
        (user) => user.realmId === realmId && sameText(user.email, email),
      ) ?? null,
    );
  }

  findByUsername(realmId: string, username: string): Promise<User | null> {
    return Promise.resolve(
      this.users.find(
        (user) => user.realmId === realmId && sameText(user.username, username),
      ) ?? null,
    );
  }

  list(realmId: string, { offset, limit }: Page): Promise<User[]> {
    return Promise.resolve(
      this.users
        .filter((user) => user.realmId === realmId)
        .sort((a, b) => a.username.localeCompare(b.username))
        .slice(offset, offset + limit),
    );
  }

  create(data: CreateUserData): Promise<User> {
    const taken = this.users.some(
      (user) =>
        user.realmId === data.realmId &&
        (sameText(user.username, data.username) ||
          sameText(user.email, data.email)),
    );
    if (taken) {
      return Promise.reject(new UserAlreadyExistsError());
    }
    const user = new User({
      id: `user-${this.users.length + 1}`,
      enabled: true,
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
      ...data,
    });
    this.users.push(user);
    return Promise.resolve(user);
  }

  update(id: string, data: UpdateUserData): Promise<User> {
    const index = this.users.findIndex((user) => user.id === id);
    const current = this.users[index];
    const updated = new User({
      id: current.id,
      realmId: current.realmId,
      username: current.username,
      email: current.email,
      emailVerified: current.emailVerified,
      passwordHash: current.passwordHash,
      enabled: current.enabled,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      ...definedFields(data),
    });
    this.users[index] = updated;
    return Promise.resolve(updated);
  }
}
