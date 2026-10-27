import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service.js';
import type { SigningKey } from '../../domain/entities/signing-key.entity.js';
import { ActiveSigningKeyAlreadyExistsError } from '../../domain/errors/active-signing-key-already-exists.error.js';
import {
  CreateSigningKeyData,
  SigningKeyRepository,
} from '../../domain/repositories/signing-key.repository.js';
import { SigningKeyStatus } from '../../domain/signing-key-status.js';
import { SigningKeyMapper } from '../mappers/signing-key.mapper.js';

@Injectable()
export class PrismaSigningKeyRepository extends SigningKeyRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findActive(realmId: string): Promise<SigningKey | null> {
    const row = await this.prisma.db.signingKey.findFirst({
      where: { realmId, status: SigningKeyStatus.ACTIVE },
    });
    return row ? SigningKeyMapper.toDomain(row) : null;
  }

  async findPublished(realmId: string): Promise<SigningKey[]> {
    const rows = await this.prisma.db.signingKey.findMany({
      where: {
        realmId,
        status: { in: [SigningKeyStatus.ACTIVE, SigningKeyStatus.PASSIVE] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => SigningKeyMapper.toDomain(row));
  }

  async create(data: CreateSigningKeyData): Promise<SigningKey> {
    try {
      const row = await this.prisma.db.signingKey.create({ data });
      return SigningKeyMapper.toDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ActiveSigningKeyAlreadyExistsError();
      }
      throw error;
    }
  }
}
