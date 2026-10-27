import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service.js';
import type { User } from '../../domain/entities/user.entity.js';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists.error.js';
import {
  CreateUserData,
  UserRepository,
} from '../../domain/repositories/user.repository.js';
import { UserMapper } from '../mappers/user.mapper.js';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
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
}
