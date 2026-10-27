import { Module } from '@nestjs/common';
import { GetRealmUseCase } from './application/use-cases/get-realm.use-case.js';
import { ListRealmsUseCase } from './application/use-cases/list-realms.use-case.js';
import { RealmRepository } from './domain/repositories/realm.repository.js';
import { PrismaRealmRepository } from './infrastructure/repositories/prisma-realm.repository.js';

@Module({
  providers: [
    { provide: RealmRepository, useClass: PrismaRealmRepository },
    GetRealmUseCase,
    ListRealmsUseCase,
  ],
  exports: [RealmRepository, GetRealmUseCase, ListRealmsUseCase],
})
export class RealmsModule {}
