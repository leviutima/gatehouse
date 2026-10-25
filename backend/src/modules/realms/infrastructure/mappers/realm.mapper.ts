import type { Realm as RealmRow } from '../../../../generated/prisma/client.js';
import { Realm } from '../../domain/entities/realm.entity.js';

export const RealmMapper = {
  toDomain(row: RealmRow): Realm {
    return new Realm({
      id: row.id,
      name: row.name,
      displayName: row.displayName,
      enabled: row.enabled,
      loginIdentifier: row.loginIdentifier,
      passwordMinLength: row.passwordMinLength,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
};
