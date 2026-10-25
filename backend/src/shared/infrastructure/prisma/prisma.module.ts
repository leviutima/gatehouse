import { Global, Module } from '@nestjs/common';
import { TransactionManager } from '../../application/persistence/transaction-manager.js';
import { PrismaTransactionManager } from './prisma-transaction-manager.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: TransactionManager, useClass: PrismaTransactionManager },
  ],
  exports: [PrismaService, TransactionManager],
})
export class PrismaModule {}
