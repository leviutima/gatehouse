import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { BootstrapMasterRealmUseCase } from '../src/modules/bootstrap/application/use-cases/bootstrap-master-realm.use-case.js';
import { MasterAdminNotConfiguredError } from '../src/modules/bootstrap/application/errors/master-admin-not-configured.error.js';
import { WeakPasswordError } from '../src/modules/realms/domain/errors/weak-password.error.js';
import { PasswordHasher } from '../src/shared/application/crypto/password-hasher.js';
import type { Env } from '../src/shared/infrastructure/config/env.schema.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('Master realm bootstrap (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let config: ConfigService<Env, true>;
  let useCase: BootstrapMasterRealmUseCase;

  const initialAdmin = () => ({
    username: config.get('GATEHOUSE_ADMIN_USERNAME', { infer: true })!,
    email: config.get('GATEHOUSE_ADMIN_EMAIL', { infer: true })!,
    password: config.get('GATEHOUSE_ADMIN_PASSWORD', { infer: true })!,
  });

  const masterRealms = () => prisma.realm.count({ where: { name: 'master' } });

  const masterAdmins = () =>
    prisma.userRole.findMany({
      where: { role: { name: 'admin', realm: { name: 'master' } } },
      include: { user: true },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    config = app.get(ConfigService);
    useCase = app.get(BootstrapMasterRealmUseCase);
  });

  afterAll(async () => {
    await useCase.execute(initialAdmin());
    await app.close();
  });

  it('creates the master realm with the admin from the environment on boot', async () => {
    const realm = await prisma.realm.findUniqueOrThrow({
      where: { name: 'master' },
      include: { users: true },
    });
    const admin = realm.users.find(
      (user) => user.username === initialAdmin().username,
    );

    expect(realm.loginIdentifier).toBe('USERNAME_OR_EMAIL');
    expect(admin?.email).toBe(initialAdmin().email);
    expect(admin?.passwordHash).toMatch(/^\$argon2id\$/);
    await expect(
      app
        .get(PasswordHasher)
        .verify(admin!.passwordHash, initialAdmin().password),
    ).resolves.toBe(true);
  });

  it('gives the master realm exactly one active signing key on boot', async () => {
    await expect(
      prisma.signingKey.count({
        where: { realm: { name: 'master' }, status: 'ACTIVE' },
      }),
    ).resolves.toBe(1);
  });

  it('makes the initial admin an admin of the master realm on boot', async () => {
    const admins = await masterAdmins();

    expect(admins.map(({ user }) => user.username)).toEqual([
      initialAdmin().username,
    ]);
  });

  it('gives the admin role back to the configured admin when master has none', async () => {
    await prisma.userRole.deleteMany({
      where: { role: { realm: { name: 'master' } } },
    });

    const result = await useCase.execute(initialAdmin());

    expect(result.status).toBe('admin_recovered');
    await expect(masterAdmins()).resolves.toHaveLength(1);
  });

  it('is idempotent across restarts', async () => {
    await expect(useCase.execute(initialAdmin())).resolves.toEqual({
      status: 'already_exists',
    });
    await expect(masterRealms()).resolves.toBe(1);
  });

  it('refuses to bootstrap without an admin when master is missing', async () => {
    await prisma.realm.delete({ where: { name: 'master' } });

    await expect(useCase.execute(null)).rejects.toBeInstanceOf(
      MasterAdminNotConfiguredError,
    );
    await expect(masterRealms()).resolves.toBe(0);
  });

  it('rolls back the master realm when the initial admin breaks the realm rules', async () => {
    await prisma.realm.deleteMany({ where: { name: 'master' } });

    await expect(
      useCase.execute({ ...initialAdmin(), password: 'too-short' }),
    ).rejects.toBeInstanceOf(WeakPasswordError);
    await expect(masterRealms()).resolves.toBe(0);
  });

  it('creates master exactly once when two instances boot at the same time', async () => {
    await prisma.realm.deleteMany({ where: { name: 'master' } });

    const results = await Promise.all([
      useCase.execute(initialAdmin()),
      useCase.execute(initialAdmin()),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      'already_exists',
      'created',
    ]);
    await expect(masterRealms()).resolves.toBe(1);
    await expect(
      prisma.user.count({ where: { realm: { name: 'master' } } }),
    ).resolves.toBe(1);
    await expect(
      prisma.signingKey.count({ where: { realm: { name: 'master' } } }),
    ).resolves.toBe(1);
    await expect(masterAdmins()).resolves.toHaveLength(1);
  });
});
