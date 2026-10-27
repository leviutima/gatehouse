import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service.js';
import type { Session } from '../../domain/entities/session.entity.js';
import {
  CreateSessionData,
  SessionRepository,
} from '../../domain/repositories/session.repository.js';
import { SessionMapper } from '../mappers/session.mapper.js';

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = await this.prisma.db.session.findUnique({
      where: { tokenHash },
    });
    return row ? SessionMapper.toDomain(row) : null;
  }

  async create(data: CreateSessionData): Promise<Session> {
    const row = await this.prisma.db.session.create({ data });
    return SessionMapper.toDomain(row);
  }

  async touch(id: string, lastSeenAt: Date): Promise<void> {
    await this.prisma.db.session.update({
      where: { id },
      data: { lastSeenAt },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.db.session.deleteMany({ where: { id } });
  }
}
