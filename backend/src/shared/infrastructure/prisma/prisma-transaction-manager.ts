import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../application/persistence/transaction-manager.js';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class PrismaTransactionManager extends TransactionManager {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.transaction(work);
  }
}
