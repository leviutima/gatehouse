import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service.js';
import type { User } from '../../domain/entities/user.entity.js';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists.error.js';
import {
  CreateUserData,
  Page,
  UpdateUserData,
  UserRepository,
} from '../../domain/repositories/user.repository.js';
import { UserMapper } from '../mappers/user.mapper.js';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(realmId: string, id: string): Promise<User | null> {
    const row = await this.prisma.db.user.findUnique({
      where: { realmId_id: { realmId, id } },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByUsername(
    realmId: string,
    username: string,
  ): Promise<User | null> {
    const row = await this.prisma.db.user.findUnique({
      where: { realmId_username: { realmId, username } },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async list(realmId: string, { offset, limit }: Page): Promise<User[]> {
    const rows = await this.prisma.db.user.findMany({
      where: { realmId },
      orderBy: { username: 'asc' },
      skip: offset,
      take: limit,
    });
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      const row = await this.prisma.db.user.create({ data });
      return UserMapper.toDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new UserAlreadyExistsError();
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const row = await this.prisma.db.user.update({ where: { id }, data });
    return UserMapper.toDomain(row);
  }
}
