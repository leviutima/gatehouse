import type { Role as RoleRow } from '../../../../generated/prisma/client.js';
import { Role } from '../../domain/entities/role.entity.js';

export const RoleMapper = {
  toDomain(row: RoleRow): Role {
    return new Role({
      id: row.id,
      realmId: row.realmId,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },
};
