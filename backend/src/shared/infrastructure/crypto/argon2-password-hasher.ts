import { Injectable } from '@nestjs/common';
import { argon2id, hash, needsRehash, verify } from 'argon2';
import { PasswordHasher } from '../../application/crypto/password-hasher.js';

export const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verify(digest: string, password: string): Promise<boolean> {
    try {
      return await verify(digest, password);
    } catch {
      return false;
    }
  }

  needsRehash(digest: string): boolean {
    return needsRehash(digest, ARGON2_OPTIONS);
  }
}
