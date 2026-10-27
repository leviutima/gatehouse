import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service.js';
import type { Realm } from '../../domain/entities/realm.entity.js';
import { RealmAlreadyExistsError } from '../../domain/errors/realm-already-exists.error.js';
import {
  CreateRealmData,
  RealmRepository,
} from '../../domain/repositories/realm.repository.js';
import { RealmMapper } from '../mappers/realm.mapper.js';

@Injectable()
export class PrismaRealmRepository extends RealmRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByName(name: string): Promise<Realm | null> {
    const row = await this.prisma.db.realm.findUnique({ where: { name } });
    return row ? RealmMapper.toDomain(row) : null;
  }

  async list(): Promise<Realm[]> {
    const rows = await this.prisma.db.realm.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => RealmMapper.toDomain(row));
  }

  async create(data: CreateRealmData): Promise<Realm> {
    try {
      const row = await this.prisma.db.realm.create({ data });
      return RealmMapper.toDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new RealmAlreadyExistsError(data.name);
      }
      throw error;
    }
  }
}
