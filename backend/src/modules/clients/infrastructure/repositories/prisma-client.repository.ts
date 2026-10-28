import { Injectable } from '@nestjs/common';
import { isUniqueViolation } from '../../../../shared/infrastructure/prisma/prisma-errors.js';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service.js';
import type { Client } from '../../domain/entities/client.entity.js';
import { ClientAlreadyExistsError } from '../../domain/errors/client-already-exists.error.js';
import {
  ClientRepository,
  CreateClientData,
  UpdateClientData,
} from '../../domain/repositories/client.repository.js';
import { ClientMapper } from '../mappers/client.mapper.js';

@Injectable()
export class PrismaClientRepository extends ClientRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByClientId(
    realmId: string,
    clientId: string,
  ): Promise<Client | null> {
    const row = await this.prisma.db.client.findUnique({
      where: { realmId_clientId: { realmId, clientId } },
    });
    return row ? ClientMapper.toDomain(row) : null;
  }

  async list(realmId: string): Promise<Client[]> {
    const rows = await this.prisma.db.client.findMany({
      where: { realmId },
      orderBy: { clientId: 'asc' },
    });
    return rows.map((row) => ClientMapper.toDomain(row));
  }

  async update(id: string, data: UpdateClientData): Promise<Client> {
    const row = await this.prisma.db.client.update({ where: { id }, data });
    return ClientMapper.toDomain(row);
  }

  async create(data: CreateClientData): Promise<Client> {
    try {
      const row = await this.prisma.db.client.create({ data });
      return ClientMapper.toDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ClientAlreadyExistsError(data.clientId);
      }
      throw error;
    }
  }
}
