import type { AuthorizationCode as AuthorizationCodeRow } from '../../../../generated/prisma/client.js';
import { AuthorizationCode } from '../../domain/entities/authorization-code.entity.js';

export const AuthorizationCodeMapper = {
  toDomain(row: AuthorizationCodeRow): AuthorizationCode {
    return new AuthorizationCode({
      id: row.id,
      realmId: row.realmId,
      codeHash: row.codeHash,
      clientId: row.clientId,
      userId: row.userId,
      sessionId: row.sessionId,
      redirectUri: row.redirectUri,
      scope: row.scope,
      codeChallenge: row.codeChallenge,
      nonce: row.nonce,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt,
      createdAt: row.createdAt,
    });
  },
};
