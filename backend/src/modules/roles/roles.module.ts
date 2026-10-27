import { Module } from '@nestjs/common';
import { AdminAuthorizer } from './application/services/admin-authorizer.js';
import { AdminRoleProvisioner } from './application/services/admin-role-provisioner.js';
import { RoleRepository } from './domain/repositories/role.repository.js';
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository.js';

@Module({
  providers: [
    { provide: RoleRepository, useClass: PrismaRoleRepository },
    AdminRoleProvisioner,
    AdminAuthorizer,
  ],
  exports: [RoleRepository, AdminRoleProvisioner, AdminAuthorizer],
})
export class RolesModule {}
