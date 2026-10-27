import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeyEncryptor } from '../../application/crypto/key-encryptor.js';
import type { Env } from '../config/env.schema.js';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

@Injectable()
export class AesGcmKeyEncryptor extends KeyEncryptor {
  private readonly key: Buffer;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.key = Buffer.from(
      config.get('GATEHOUSE_KEY_ENCRYPTION_KEY', { infer: true }),
      'base64',
    );
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: TAG_BYTES,
    });
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      VERSION,
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(payload: string): string {
    const [version, iv, tag, ciphertext, ...rest] = payload.split('.');
    if (
      version !== VERSION ||
      !iv ||
      !tag ||
      ciphertext === undefined ||
      rest.length > 0
    ) {
      throw new Error('Unsupported encrypted key format');
    }
    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(iv, 'base64url'),
      { authTagLength: TAG_BYTES },
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
