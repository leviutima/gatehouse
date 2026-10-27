import { Module } from '@nestjs/common';
import { RealmRepository } from './domain/repositories/realm.repository.js';
import { PrismaRealmRepository } from './infrastructure/repositories/prisma-realm.repository.js';

@Module({
  providers: [{ provide: RealmRepository, useClass: PrismaRealmRepository }],
  exports: [RealmRepository],
})
export class RealmsModule {}
