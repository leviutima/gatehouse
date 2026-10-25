import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { validateEnv } from './shared/infrastructure/config/env.schema.js';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module.js';
import { DomainErrorFilter } from './shared/presentation/filters/domain-error.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
  ],
  controllers: [],
  providers: [{ provide: APP_FILTER, useClass: DomainErrorFilter }],
})
export class AppModule {}
