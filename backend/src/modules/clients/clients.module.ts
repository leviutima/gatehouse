import { Module } from '@nestjs/common';
import { ClientRepository } from './domain/repositories/client.repository.js';
import { PrismaClientRepository } from './infrastructure/repositories/prisma-client.repository.js';

@Module({
  providers: [{ provide: ClientRepository, useClass: PrismaClientRepository }],
  exports: [ClientRepository],
})
export class ClientsModule {}
