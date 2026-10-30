import type { Session as SessionRow } from '../../../../generated/prisma/client.js';
import { Session } from '../../domain/entities/session.entity.js';

export const SessionMapper = {
  toDomain(row: SessionRow): Session {
    return new Session({
      id: row.id,
      realmId: row.realmId,
      userId: row.userId,
      tokenHash: row.tokenHash,
      authTime: row.authTime,
      lastSeenAt: row.lastSeenAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  },
};
