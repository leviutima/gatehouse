import { Module } from '@nestjs/common';
import { UserRepository } from './domain/repositories/user.repository.js';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository.js';

@Module({
  providers: [{ provide: UserRepository, useClass: PrismaUserRepository }],
  exports: [UserRepository],
})
export class UsersModule {}
