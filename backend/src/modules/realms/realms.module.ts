import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { BootstrapMasterRealmUseCase } from './application/use-cases/bootstrap-master-realm.use-case.js';
import { RealmRepository } from './domain/repositories/realm.repository.js';
import { MasterRealmBootstrap } from './infrastructure/bootstrap/master-realm.bootstrap.js';
import { PrismaRealmRepository } from './infrastructure/repositories/prisma-realm.repository.js';

@Module({
  imports: [UsersModule],
  providers: [
    { provide: RealmRepository, useClass: PrismaRealmRepository },
    BootstrapMasterRealmUseCase,
    MasterRealmBootstrap,
  ],
  exports: [RealmRepository],
})
export class RealmsModule {}
