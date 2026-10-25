import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { RealmNotFoundError } from '../src/modules/realms/domain/errors/realm-not-found.error.js';
import { WeakPasswordError } from '../src/modules/realms/domain/errors/weak-password.error.js';
import { CreateUserUseCase } from '../src/modules/users/application/use-cases/create-user.use-case.js';
import { UserAlreadyExistsError } from '../src/modules/users/domain/errors/user-already-exists.error.js';
import { PasswordHasher } from '../src/shared/application/crypto/password-hasher.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('CreateUserUseCase (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createUser: CreateUserUseCase;
  const suffix = Date.now();
  const shop = `shop-${suffix}`;
  const other = `other-${suffix}`;
  const newsletter = `newsletter-${suffix}`;
  const password = 'a-long-enough-password';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    createUser = app.get(CreateUserUseCase);

    await prisma.realm.createMany({
      data: [
        { name: shop, displayName: 'Shop' },
        { name: other, displayName: 'Other' },
        {
          name: newsletter,
          displayName: 'Newsletter',
          loginIdentifier: 'EMAIL',
          passwordMinLength: 16,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.realm.deleteMany({
      where: { name: { in: [shop, other, newsletter] } },
    });
    await app.close();
  });

  it('persists the user with an argon2id hash of the password', async () => {
    const user = await createUser.execute({
      realmName: shop,
      username: 'Joao',
      email: 'Joao@Mail.com',
      password,
    });

    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row).toMatchObject({
      username: 'Joao',
      email: 'Joao@Mail.com',
      emailVerified: false,
    });
    await expect(
      app.get(PasswordHasher).verify(row.passwordHash, password),
    ).resolves.toBe(true);
  });

  it('rejects the same username with different case in the same realm', async () => {
    await expect(
      createUser.execute({
        realmName: shop,
        username: 'JOAO',
        email: 'another@mail.com',
        password,
      }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  it('rejects the same email with different case in the same realm', async () => {
    await expect(
      createUser.execute({
        realmName: shop,
        username: 'another',
        email: 'JOAO@MAIL.COM',
        password,
      }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  it('allows the same username and email in another realm', async () => {
    await expect(
      createUser.execute({
        realmName: other,
        username: 'joao',
        email: 'joao@mail.com',
        password,
      }),
    ).resolves.toMatchObject({ username: 'joao' });
  });

  it('stores the email as username in an EMAIL realm', async () => {
    const user = await createUser.execute({
      realmName: newsletter,
      email: 'reader@mail.com',
      password: 'sixteen-chars-pass',
    });

    expect(user.username).toBe('reader@mail.com');
  });

  it('applies the per-realm minimum password length', async () => {
    await expect(
      createUser.execute({
        realmName: newsletter,
        email: 'short@mail.com',
        password: 'fifteen-chars-p',
      }),
    ).rejects.toBeInstanceOf(WeakPasswordError);
    await expect(
      prisma.user.count({ where: { email: 'short@mail.com' } }),
    ).resolves.toBe(0);
  });

  it('fails for an unknown realm', async () => {
    await expect(
      createUser.execute({
        realmName: `missing-${suffix}`,
        username: 'joao',
        email: 'joao@mail.com',
        password,
      }),
    ).rejects.toBeInstanceOf(RealmNotFoundError);
  });
});
