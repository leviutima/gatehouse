import type { RefreshToken as RefreshTokenRow } from '../../../../generated/prisma/client.js';
import { RefreshToken } from '../../domain/entities/refresh-token.entity.js';

export const RefreshTokenMapper = {
  toDomain(row: RefreshTokenRow): RefreshToken {
    return new RefreshToken({
      id: row.id,
      realmId: row.realmId,
      tokenHash: row.tokenHash,
      familyId: row.familyId,
      clientId: row.clientId,
      userId: row.userId,
      sessionId: row.sessionId,
      scope: row.scope,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    });
  },
};
