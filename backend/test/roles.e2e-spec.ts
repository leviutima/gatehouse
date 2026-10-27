import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { AdminRoleProvisioner } from '../src/modules/roles/application/services/admin-role-provisioner.js';
import { RoleRepository } from '../src/modules/roles/domain/repositories/role.repository.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Roles (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let roles: RoleRepository;
  let provisioner: AdminRoleProvisioner;
  const suffix = Date.now();
  const shop = `roles-shop-${suffix}`;
  const other = `roles-other-${suffix}`;
  let shopId: string;
  let otherId: string;
  let shopUserId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    roles = app.get(RoleRepository);
    provisioner = app.get(AdminRoleProvisioner);

    shopId = (
      await prisma.realm.create({ data: { name: shop, displayName: 'Shop' } })
    ).id;
    otherId = (
      await prisma.realm.create({ data: { name: other, displayName: 'Other' } })
    ).id;
    shopUserId = (
      await prisma.user.create({
        data: {
          realmId: shopId,
          username: 'ana',
          email: 'ana@shop.example',
          passwordHash: 'unused',
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({ where: { name: { in: [shop, other] } } });
    await app.close();
  });

  it('creates the admin role once and grants it idempotently', async () => {
    await provisioner.grantAdmin(shopId, shopUserId);
    await provisioner.grantAdmin(shopId, shopUserId);

    const assignments = await prisma.userRole.findMany({
      where: { userId: shopUserId },
      include: { role: true },
    });
    expect(assignments).toHaveLength(1);
    expect(assignments[0].role).toMatchObject({
      realmId: shopId,
      name: 'admin',
    });
    await expect(provisioner.hasAnyAdmin(shopId)).resolves.toBe(true);
    await expect(provisioner.hasAnyAdmin(otherId)).resolves.toBe(false);
  });

  it('refuses to give a user a role of another realm', async () => {
    const otherAdmin = await provisioner.ensureAdminRole(otherId);

    await expect(
      roles.assign({
        realmId: shopId,
        userId: shopUserId,
        roleId: otherAdmin.id,
      }),
    ).rejects.toThrow();
    await expect(
      roles.assign({
        realmId: otherId,
        userId: shopUserId,
        roleId: otherAdmin.id,
      }),
    ).rejects.toThrow();
    await expect(provisioner.hasAnyAdmin(otherId)).resolves.toBe(false);
  });

  it('answers whether an enabled user holds a role in a realm', async () => {
    await expect(roles.isUserInRole(shop, shopUserId, 'admin')).resolves.toBe(
      true,
    );
    await expect(roles.isUserInRole(other, shopUserId, 'admin')).resolves.toBe(
      false,
    );
    await expect(roles.isUserInRole(shop, shopUserId, 'billing')).resolves.toBe(
      false,
    );

    await prisma.user.update({
      where: { id: shopUserId },
      data: { enabled: false },
    });
    try {
      await expect(roles.isUserInRole(shop, shopUserId, 'admin')).resolves.toBe(
        false,
      );
    } finally {
      await prisma.user.update({
        where: { id: shopUserId },
        data: { enabled: true },
      });
    }
  });

  it('drops the assignments when the user is deleted', async () => {
    await prisma.user.delete({ where: { id: shopUserId } });

    await expect(provisioner.hasAnyAdmin(shopId)).resolves.toBe(false);
  });
});
