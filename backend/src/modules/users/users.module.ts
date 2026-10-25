import { Module } from '@nestjs/common';
import { RealmsModule } from '../realms/realms.module.js';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { UserRepository } from './domain/repositories/user.repository.js';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository.js';

@Module({
  imports: [RealmsModule],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    CreateUserUseCase,
  ],
  exports: [UserRepository, CreateUserUseCase],
})
export class UsersModule {}
