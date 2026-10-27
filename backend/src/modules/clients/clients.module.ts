import { Module } from '@nestjs/common';
import { RealmsModule } from '../realms/realms.module.js';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case.js';
import { ClientRepository } from './domain/repositories/client.repository.js';
import { PrismaClientRepository } from './infrastructure/repositories/prisma-client.repository.js';

@Module({
  imports: [RealmsModule],
  providers: [
    { provide: ClientRepository, useClass: PrismaClientRepository },
    CreateClientUseCase,
  ],
  exports: [ClientRepository, CreateClientUseCase],
})
export class ClientsModule {}
