import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service.js';
import type { Role } from '../../domain/entities/role.entity.js';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists.error.js';
import {
  CreateRoleData,
  RoleAssignment,
  RoleRepository,
} from '../../domain/repositories/role.repository.js';
import { RoleMapper } from '../mappers/role.mapper.js';

@Injectable()
export class PrismaRoleRepository extends RoleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByName(realmId: string, name: string): Promise<Role | null> {
    const row = await this.prisma.db.role.findUnique({
      where: { realmId_name: { realmId, name } },
    });
    return row ? RoleMapper.toDomain(row) : null;
  }

  async create(data: CreateRoleData): Promise<Role> {
    try {
      const row = await this.prisma.db.role.create({ data });
      return RoleMapper.toDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new RoleAlreadyExistsError(data.name);
      }
      throw error;
    }
  }

  async assign(assignment: RoleAssignment): Promise<void> {
    await this.prisma.db.userRole.createMany({
      data: [assignment],
      skipDuplicates: true,
    });
  }

  countMembers(roleId: string): Promise<number> {
    return this.prisma.db.userRole.count({ where: { roleId } });
  }

  countEnabledMembers(realmName: string, roleName: string): Promise<number> {
    return this.prisma.db.userRole.count({
      where: {
        user: { enabled: true },
        role: { name: roleName, realm: { name: realmName } },
      },
    });
  }

  async isUserInRole(
    realmName: string,
    userId: string,
    roleName: string,
  ): Promise<boolean> {
    const assignments = await this.prisma.db.userRole.count({
      where: {
        userId,
        user: { enabled: true },
        role: { name: roleName, realm: { name: realmName } },
      },
    });
    return assignments > 0;
  }
}
