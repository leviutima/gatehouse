import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionManager } from '../src/shared/application/persistence/transaction-manager.js';
import { validateEnv } from '../src/shared/infrastructure/config/env.schema.js';
import { PrismaModule } from '../src/shared/infrastructure/prisma/prisma.module.js';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service.js';

describe('PrismaTransactionManager (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let transactions: TransactionManager;
  const realmName = `tx-probe-${Date.now()}`;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        PrismaModule,
      ],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    transactions = moduleRef.get(TransactionManager);
  });

  afterEach(async () => {
    await prisma.realm.deleteMany({ where: { name: realmName } });
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  const createProbeRealm = () =>
    prisma.db.realm.create({
      data: { name: realmName, displayName: 'Transaction probe' },
    });

  it('commits every write when the work succeeds', async () => {
    await transactions.run(createProbeRealm);

    await expect(
      prisma.realm.count({ where: { name: realmName } }),
    ).resolves.toBe(1);
  });

  it('rolls back every write when the work throws', async () => {
    await expect(
      transactions.run(async () => {
        await createProbeRealm();
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    await expect(
      prisma.realm.count({ where: { name: realmName } }),
    ).resolves.toBe(0);
  });

  it('joins the outer transaction when runs are nested', async () => {
    await expect(
      transactions.run(async () => {
        await transactions.run(createProbeRealm);
        throw new Error('outer failure');
      }),
    ).rejects.toThrow('outer failure');

    await expect(
      prisma.realm.count({ where: { name: realmName } }),
    ).resolves.toBe(0);
  });

  it('writes through the plain client outside a transaction', async () => {
    await createProbeRealm();

    await expect(
      prisma.realm.count({ where: { name: realmName } }),
    ).resolves.toBe(1);
  });
});
