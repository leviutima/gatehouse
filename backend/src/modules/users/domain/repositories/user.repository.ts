import type { User } from '../entities/user.entity.js';

export interface CreateUserData {
  realmId: string;
  username: string;
  email: string;
  emailVerified: boolean;
  passwordHash: string;
}

export abstract class UserRepository {
  abstract findByUsername(
    realmId: string,
    username: string,
  ): Promise<User | null>;
  abstract create(data: CreateUserData): Promise<User>;
}
