import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema.js';
import { AesGcmKeyEncryptor } from './aes-gcm-key-encryptor.js';

function encryptor(key = randomBytes(32).toString('base64')) {
  return new AesGcmKeyEncryptor(
    new ConfigService<Env, true>({ GATEHOUSE_KEY_ENCRYPTION_KEY: key }),
  );
}

function tamper(payload: string, part: number): string {
  const parts = payload.split('.');
  const bytes = Buffer.from(parts[part], 'base64url');
  bytes[0] ^= 1;
  parts[part] = bytes.toString('base64url');
  return parts.join('.');
}

describe('AesGcmKeyEncryptor', () => {
  const plaintext =
    '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';

  it('decrypts what it encrypted', () => {
    const subject = encryptor();

    expect(subject.decrypt(subject.encrypt(plaintext))).toBe(plaintext);
  });

  it('produces a versioned payload that does not contain the plaintext', () => {
    const payload = encryptor().encrypt(plaintext);

    expect(payload).toMatch(/^v1\.[\w-]{16}\.[\w-]{22}\.[\w-]+$/);
    expect(payload).not.toContain('PRIVATE KEY');
  });

  it('uses a fresh IV for every encryption', () => {
    const subject = encryptor();

    expect(subject.encrypt(plaintext)).not.toBe(subject.encrypt(plaintext));
  });

  it.each([
    ['IV', 1],
    ['auth tag', 2],
    ['ciphertext', 3],
  ])('rejects a payload with a tampered %s', (_part, index) => {
    const subject = encryptor();
    const payload = subject.encrypt(plaintext);

    expect(() => subject.decrypt(tamper(payload, index))).toThrow();
  });

  it('rejects a payload with a truncated auth tag', () => {
    const subject = encryptor();
    const [version, iv, tag, ciphertext] = subject
      .encrypt(plaintext)
      .split('.');
    const shortTag = Buffer.from(tag, 'base64url')
      .subarray(0, 4)
      .toString('base64url');

    expect(() =>
      subject.decrypt([version, iv, shortTag, ciphertext].join('.')),
    ).toThrow();
  });

  it('cannot decrypt with a different master key', () => {
    const payload = encryptor().encrypt(plaintext);

    expect(() => encryptor().decrypt(payload)).toThrow();
  });

  it.each(['', 'v2.a.b.c', 'v1.a.b', 'v1.a.b.c.d', 'plain-text'])(
    'rejects the malformed payload "%s"',
    (payload) => {
      expect(() => encryptor().decrypt(payload)).toThrow(
        'Unsupported encrypted key format',
      );
    },
  );
});
