import { KeyEncryptor } from '../application/crypto/key-encryptor.js';

const PREFIX = 'encrypted:';

export class FakeKeyEncryptor extends KeyEncryptor {
  encrypt(plaintext: string): string {
    return `${PREFIX}${plaintext}`;
  }

  decrypt(payload: string): string {
    return payload.slice(PREFIX.length);
  }
}
