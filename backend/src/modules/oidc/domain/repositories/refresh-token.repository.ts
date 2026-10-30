import type { RefreshToken } from '../entities/refresh-token.entity.js';

export interface CreateRefreshTokenData {
  realmId: string;
  tokenHash: string;
  familyId?: string;
  clientId: string;
  userId: string;
  sessionId: string;
  scope: string;
  expiresAt: Date;
}

export abstract class RefreshTokenRepository {
  abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  abstract create(data: CreateRefreshTokenData): Promise<RefreshToken>;
  abstract markUsed(id: string, usedAt: Date): Promise<boolean>;
  abstract revokeFamily(familyId: string): Promise<void>;
}
