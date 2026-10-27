import { Module } from '@nestjs/common';
import { RealmsModule } from '../realms/realms.module.js';
import { PasswordAuthenticator } from './application/services/password-authenticator.js';
import { UserRegistrar } from './application/services/user-registrar.js';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { GetUserUseCase } from './application/use-cases/get-user.use-case.js';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case.js';
import { ResetUserPasswordUseCase } from './application/use-cases/reset-user-password.use-case.js';
import { UserRepository } from './domain/repositories/user.repository.js';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository.js';

@Module({
  imports: [RealmsModule],
  providers: [
    { provide: UserRepository, useClass: PrismaUserRepository },
    UserRegistrar,
    PasswordAuthenticator,
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    ResetUserPasswordUseCase,
  ],
  exports: [
    UserRepository,
    UserRegistrar,
    PasswordAuthenticator,
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    ResetUserPasswordUseCase,
  ],
})
export class UsersModule {}
