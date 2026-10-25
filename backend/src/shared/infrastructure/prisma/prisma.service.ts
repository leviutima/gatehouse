import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import type { Env } from '../config/env.schema.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly transactions =
    new AsyncLocalStorage<Prisma.TransactionClient>();
  private readonly client: Prisma.TransactionClient;

  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
    });
    this.client = this;
  }

  get db(): Prisma.TransactionClient {
    return this.transactions.getStore() ?? this.client;
  }

  transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.transactions.getStore()) {
      return work();
    }
    return this.$transaction((tx) => this.transactions.run(tx, work));
  }

  async onModuleInit(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
