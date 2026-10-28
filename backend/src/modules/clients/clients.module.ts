import { Module } from '@nestjs/common';
import { RealmsModule } from '../realms/realms.module.js';
import { ClientAuthenticator } from './application/services/client-authenticator.js';
import { RealmClientFinder } from './application/services/realm-client-finder.js';
import { CreateClientUseCase } from './application/use-cases/create-client.use-case.js';
import { GetClientUseCase } from './application/use-cases/get-client.use-case.js';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case.js';
import { RotateClientSecretUseCase } from './application/use-cases/rotate-client-secret.use-case.js';
import { UpdateClientUseCase } from './application/use-cases/update-client.use-case.js';
import { ClientRepository } from './domain/repositories/client.repository.js';
import { PrismaClientRepository } from './infrastructure/repositories/prisma-client.repository.js';

@Module({
  imports: [RealmsModule],
  providers: [
    { provide: ClientRepository, useClass: PrismaClientRepository },
    ClientAuthenticator,
    RealmClientFinder,
    CreateClientUseCase,
    ListClientsUseCase,
    GetClientUseCase,
    UpdateClientUseCase,
    RotateClientSecretUseCase,
  ],
  exports: [
    ClientRepository,
    ClientAuthenticator,
    CreateClientUseCase,
    ListClientsUseCase,
    GetClientUseCase,
    UpdateClientUseCase,
    RotateClientSecretUseCase,
  ],
})
export class ClientsModule {}
