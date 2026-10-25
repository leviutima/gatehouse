import { Module } from '@nestjs/common';
import { RealmsModule } from '../realms/realms.module.js';
import { UsersModule } from '../users/users.module.js';
import { BootstrapMasterRealmUseCase } from './application/use-cases/bootstrap-master-realm.use-case.js';
import { MasterRealmBootstrap } from './infrastructure/master-realm.bootstrap.js';

@Module({
  imports: [RealmsModule, UsersModule],
  providers: [BootstrapMasterRealmUseCase, MasterRealmBootstrap],
})
export class BootstrapModule {}
