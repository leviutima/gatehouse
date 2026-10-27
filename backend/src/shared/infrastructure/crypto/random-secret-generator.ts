import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SecretGenerator } from '../../application/crypto/secret-generator.js';

const SECRET_BYTES = 32;

@Injectable()
export class RandomSecretGenerator extends SecretGenerator {
  generate(): string {
    return randomBytes(SECRET_BYTES).toString('base64url');
  }
}
