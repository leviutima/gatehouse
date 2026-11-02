import { Injectable } from '@nestjs/common';
import { SecretGenerator } from '../../../../shared/application/crypto/secret-generator.js';
import { SecretHasher } from '../../../../shared/application/crypto/secret-hasher.js';
import type { Session } from '../../../sessions/domain/entities/session.entity.js';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.js';

export interface RefreshTokenGrant {
  clientId: string;
  session: Session;
  scope: string;
  familyId?: string;
}

@Injectable()
export class RefreshTokenIssuer {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly secretGenerator: SecretGenerator,
    private readonly secretHasher: SecretHasher,
  ) {}

  async issue({
    clientId,
    session,
    scope,
    familyId,
  }: RefreshTokenGrant): Promise<string> {
    const token = this.secretGenerator.generate();
    await this.refreshTokens.create({
      realmId: session.realmId,
      tokenHash: this.secretHasher.hash(token),
      familyId,
      clientId,
      userId: session.userId,
      sessionId: session.id,
      scope,
      expiresAt: session.expiresAt,
    });
    return token;
  }
}
