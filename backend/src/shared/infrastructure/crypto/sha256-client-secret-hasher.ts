import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ClientSecretHasher } from '../../application/crypto/client-secret-hasher.js';

const PREFIX = 'sha256$';

@Injectable()
export class Sha256ClientSecretHasher extends ClientSecretHasher {
  hash(secret: string): string {
    return PREFIX + createHash('sha256').update(secret).digest('base64url');
  }

  verify(hash: string, secret: string): boolean {
    const expected = Buffer.from(hash);
    const actual = Buffer.from(this.hash(secret));
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
