import { PasswordHasher } from '../application/crypto/password-hasher.js';

export class FakePasswordHasher extends PasswordHasher {
  readonly hash = vi.fn((password: string) =>
    Promise.resolve(`hashed:${password}`),
  );

  verify(hash: string, password: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${password}`);
  }

  needsRehash(): boolean {
    return false;
  }
}
