import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service.js';
import type { RefreshToken } from '../../domain/entities/refresh-token.entity.js';
import {
  CreateRefreshTokenData,
  RefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository.js';
import { RefreshTokenMapper } from '../mappers/refresh-token.mapper.js';

@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.prisma.db.refreshToken.findUnique({
      where: { tokenHash },
    });
    return row ? RefreshTokenMapper.toDomain(row) : null;
  }

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const row = await this.prisma.db.refreshToken.create({ data });
    return RefreshTokenMapper.toDomain(row);
  }

  async markUsed(id: string, usedAt: Date): Promise<boolean> {
    const { count } = await this.prisma.db.refreshToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt },
    });
    return count === 1;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.db.refreshToken.deleteMany({ where: { familyId } });
  }
}
