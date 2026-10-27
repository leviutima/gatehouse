import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { RealmsModule } from '../realms/realms.module.js';
import { RolesModule } from '../roles/roles.module.js';
import { SigningKeysModule } from '../signing-keys/signing-keys.module.js';
import { UsersModule } from '../users/users.module.js';
import { RealmResourceFinder } from './application/services/realm-resource-finder.js';
import { AssignUserRoleUseCase } from './application/use-cases/assign-user-role.use-case.js';
import { CreateRealmUseCase } from './application/use-cases/create-realm.use-case.js';
import { CreateRoleUseCase } from './application/use-cases/create-role.use-case.js';
import { DeleteRoleUseCase } from './application/use-cases/delete-role.use-case.js';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case.js';
import { ListUserRolesUseCase } from './application/use-cases/list-user-roles.use-case.js';
import { UnassignUserRoleUseCase } from './application/use-cases/unassign-user-role.use-case.js';
import { UpdateRealmUseCase } from './application/use-cases/update-realm.use-case.js';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case.js';
import { AdminClientsController } from './presentation/controllers/admin-clients.controller.js';
import { AdminRealmsController } from './presentation/controllers/admin-realms.controller.js';
import { AdminRolesController } from './presentation/controllers/admin-roles.controller.js';
import { AdminUserRolesController } from './presentation/controllers/admin-user-roles.controller.js';
import { AdminUsersController } from './presentation/controllers/admin-users.controller.js';
import { AdminGuard } from './presentation/guards/admin.guard.js';

@Module({
  imports: [
    RealmsModule,
    UsersModule,
    RolesModule,
    SigningKeysModule,
    ClientsModule,
  ],
  controllers: [
    AdminRealmsController,
    AdminUsersController,
    AdminRolesController,
    AdminUserRolesController,
    AdminClientsController,
  ],
  providers: [
    RealmResourceFinder,
    CreateRealmUseCase,
    UpdateRealmUseCase,
    UpdateUserUseCase,
    ListRolesUseCase,
    CreateRoleUseCase,
    DeleteRoleUseCase,
    ListUserRolesUseCase,
    AssignUserRoleUseCase,
    UnassignUserRoleUseCase,
    AdminGuard,
  ],
})
export class AdminModule {}
