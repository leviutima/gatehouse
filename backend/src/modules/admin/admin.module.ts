import { Module } from '@nestjs/common';
import { RealmsModule } from '../realms/realms.module.js';
import { RolesModule } from '../roles/roles.module.js';
import { SigningKeysModule } from '../signing-keys/signing-keys.module.js';
import { UsersModule } from '../users/users.module.js';
import { RealmResourceFinder } from './application/services/realm-resource-finder.js';
import { CreateRealmUseCase } from './application/use-cases/create-realm.use-case.js';
import { UpdateRealmUseCase } from './application/use-cases/update-realm.use-case.js';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case.js';
import { AdminRealmsController } from './presentation/controllers/admin-realms.controller.js';
import { AdminUsersController } from './presentation/controllers/admin-users.controller.js';
import { AdminGuard } from './presentation/guards/admin.guard.js';

@Module({
  imports: [RealmsModule, UsersModule, RolesModule, SigningKeysModule],
  controllers: [AdminRealmsController, AdminUsersController],
  providers: [
    RealmResourceFinder,
    CreateRealmUseCase,
    UpdateRealmUseCase,
    UpdateUserUseCase,
    AdminGuard,
  ],
})
export class AdminModule {}
