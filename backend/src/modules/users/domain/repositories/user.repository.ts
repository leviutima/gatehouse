import type { User } from '../entities/user.entity.js';

export interface CreateUserData {
  realmId: string;
  username: string;
  email: string;
  emailVerified: boolean;
  passwordHash: string;
}

export interface UpdateUserData {
  enabled?: boolean;
  emailVerified?: boolean;
  passwordHash?: string;
}

export interface Page {
  offset: number;
  limit: number;
}

export abstract class UserRepository {
  abstract findById(realmId: string, id: string): Promise<User | null>;
  abstract findByUsername(
    realmId: string,
    username: string,
  ): Promise<User | null>;
  abstract list(realmId: string, page: Page): Promise<User[]>;
  abstract create(data: CreateUserData): Promise<User>;
  abstract update(id: string, data: UpdateUserData): Promise<User>;
}
