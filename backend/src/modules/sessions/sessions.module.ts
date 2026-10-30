import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { SessionManager } from './application/services/session-manager.js';
import { SessionRepository } from './domain/repositories/session.repository.js';
import { PrismaSessionRepository } from './infrastructure/repositories/prisma-session.repository.js';

@Module({
  imports: [UsersModule],
  providers: [
    { provide: SessionRepository, useClass: PrismaSessionRepository },
    SessionManager,
  ],
  exports: [SessionManager],
})
export class SessionsModule {}
