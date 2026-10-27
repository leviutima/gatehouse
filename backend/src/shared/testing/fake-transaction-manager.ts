import { TransactionManager } from '../application/persistence/transaction-manager.js';

export class FakeTransactionManager extends TransactionManager {
  readonly runs = vi.fn();
  active = false;

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.runs();
    this.active = true;
    try {
      return await work();
    } finally {
      this.active = false;
    }
  }
}
