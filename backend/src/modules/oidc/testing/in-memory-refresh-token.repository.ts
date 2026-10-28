import { TEST_NOW } from '../../../shared/testing/test-clock.js';
import { RefreshToken } from '../domain/entities/refresh-token.entity.js';
import {
  CreateRefreshTokenData,
  RefreshTokenRepository,
} from '../domain/repositories/refresh-token.repository.js';

export class InMemoryRefreshTokenRepository extends RefreshTokenRepository {
  readonly tokens: RefreshToken[] = [];

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return Promise.resolve(
      this.tokens.find((token) => token.tokenHash === tokenHash) ?? null,
    );
  }

  create({ familyId, ...data }: CreateRefreshTokenData): Promise<RefreshToken> {
    const id = `refresh-${this.tokens.length + 1}`;
    const token = new RefreshToken({
      id,
      familyId: familyId ?? `family-of-${id}`,
      usedAt: null,
      createdAt: TEST_NOW,
      ...data,
    });
    this.tokens.push(token);
    return Promise.resolve(token);
  }

  markUsed(id: string, usedAt: Date): Promise<boolean> {
    const index = this.tokens.findIndex((token) => token.id === id);
    const current = this.tokens[index];
    if (!current || current.isUsed) {
      return Promise.resolve(false);
    }
    this.tokens[index] = new RefreshToken({
      id: current.id,
      realmId: current.realmId,
      tokenHash: current.tokenHash,
      familyId: current.familyId,
      clientId: current.clientId,
      userId: current.userId,
      sessionId: current.sessionId,
      scope: current.scope,
      expiresAt: current.expiresAt,
      usedAt,
      createdAt: current.createdAt,
    });
    return Promise.resolve(true);
  }

  revokeFamily(familyId: string): Promise<void> {
    for (let index = this.tokens.length - 1; index >= 0; index--) {
      if (this.tokens[index].familyId === familyId) {
        this.tokens.splice(index, 1);
      }
    }
    return Promise.resolve();
  }
}
