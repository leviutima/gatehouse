import { SecretHasher } from '../application/crypto/secret-hasher.js';

export class FakeSecretHasher extends SecretHasher {
  hash(secret: string): string {
    return `hashed:${secret}`;
  }

  verify(hash: string, secret: string): boolean {
    return hash === this.hash(secret);
  }
}
