import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { BootstrapModule } from './modules/bootstrap/bootstrap.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { OidcModule } from './modules/oidc/oidc.module.js';
import { SigningKeysModule } from './modules/signing-keys/signing-keys.module.js';
import { CryptoModule } from './shared/infrastructure/crypto/crypto.module.js';
import { validateEnv } from './shared/infrastructure/config/env.schema.js';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module.js';
import { TimeModule } from './shared/infrastructure/time/time.module.js';
import { DomainErrorFilter } from './shared/presentation/filters/domain-error.filter.js';
import { AccessTokenGuard } from './shared/presentation/guards/access-token.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    CryptoModule,
    TimeModule,
    BootstrapModule,
    ClientsModule,
    SigningKeysModule,
    OidcModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
  ],
})
export class AppModule {}
