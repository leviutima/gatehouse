import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { BootstrapMasterRealmUseCase } from '../src/modules/bootstrap/application/use-cases/bootstrap-master-realm.use-case.js';
import { MasterAdminNotConfiguredError } from '../src/modules/bootstrap/application/errors/master-admin-not-configured.error.js';
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
  });
});
