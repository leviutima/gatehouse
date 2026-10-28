import { SecretGenerator } from '../application/crypto/secret-generator.js';

export class SequentialSecretGenerator extends SecretGenerator {
  constructor(private readonly prefix = 'secret') {
    super();
  }

  readonly generate = vi.fn(
    () => `${this.prefix}-${this.generate.mock.calls.length}`,
  );
}
