import type { User as UserRow } from '../../../../generated/prisma/client.js';
import { User } from '../../domain/entities/user.entity.js';

export const UserMapper = {
  toDomain(row: UserRow): User {
    return new User({
      id: row.id,
      realmId: row.realmId,
      username: row.username,
      email: row.email,
      emailVerified: row.emailVerified,
      passwordHash: row.passwordHash,
      enabled: row.enabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
};
