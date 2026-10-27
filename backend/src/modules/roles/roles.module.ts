import { Module } from '@nestjs/common';
import { AdminRoleProvisioner } from './application/services/admin-role-provisioner.js';
import { RoleRepository } from './domain/repositories/role.repository.js';
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository.js';

@Module({
  providers: [
    { provide: RoleRepository, useClass: PrismaRoleRepository },
    AdminRoleProvisioner,
  ],
  exports: [RoleRepository, AdminRoleProvisioner],
})
export class RolesModule {}
