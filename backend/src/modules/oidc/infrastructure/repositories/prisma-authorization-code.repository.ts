import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service.js';
import type { AuthorizationCode } from '../../domain/entities/authorization-code.entity.js';
import {
  AuthorizationCodeRepository,
  CreateAuthorizationCodeData,
} from '../../domain/repositories/authorization-code.repository.js';
import { AuthorizationCodeMapper } from '../mappers/authorization-code.mapper.js';

@Injectable()
export class PrismaAuthorizationCodeRepository extends AuthorizationCodeRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByCodeHash(codeHash: string): Promise<AuthorizationCode | null> {
    const row = await this.prisma.db.authorizationCode.findUnique({
      where: { codeHash },
    });
    return row ? AuthorizationCodeMapper.toDomain(row) : null;
  }

  async markConsumed(id: string, consumedAt: Date): Promise<boolean> {
    const { count } = await this.prisma.db.authorizationCode.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt },
    });
    return count === 1;
  }

  async create(data: CreateAuthorizationCodeData): Promise<AuthorizationCode> {
    const row = await this.prisma.db.authorizationCode.create({ data });
    return AuthorizationCodeMapper.toDomain(row);
  }
}
