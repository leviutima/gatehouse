import { Module } from '@nestjs/common';
import { RealmsModule } from '../realms/realms.module.js';
import { UserRegistrar } from './application/services/user-registrar.js';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { UserRepository } from './domain/repositories/user.repository.js';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository.js';

@Module({
  imports: [RealmsModule],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    UserRegistrar,
    CreateUserUseCase,
  ],
  exports: [UserRepository, UserRegistrar, CreateUserUseCase],
})
export class UsersModule {}
