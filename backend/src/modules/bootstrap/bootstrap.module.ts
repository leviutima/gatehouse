import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { RealmsModule } from '../realms/realms.module.js';
import { RolesModule } from '../roles/roles.module.js';
import { SigningKeysModule } from '../signing-keys/signing-keys.module.js';
import { UsersModule } from '../users/users.module.js';
import { BootstrapMasterRealmUseCase } from './application/use-cases/bootstrap-master-realm.use-case.js';
import { EnsureAdminConsoleClientUseCase } from './application/use-cases/ensure-admin-console-client.use-case.js';
import { MasterRealmBootstrap } from './infrastructure/master-realm.bootstrap.js';

@Module({
  imports: [
    RealmsModule,
    UsersModule,
    SigningKeysModule,
    RolesModule,
    ClientsModule,
  ],
  providers: [
    BootstrapMasterRealmUseCase,
    EnsureAdminConsoleClientUseCase,
    MasterRealmBootstrap,
  ],
})
export class BootstrapModule {}
