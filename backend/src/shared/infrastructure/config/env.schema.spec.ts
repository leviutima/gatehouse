import { validateEnv } from './env.schema.js';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
const GATEHOUSE_KEY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const required = { DATABASE_URL, GATEHOUSE_KEY_ENCRYPTION_KEY };

describe('validateEnv', () => {
  it('applies defaults when optional variables are absent', () => {
    expect(validateEnv({ ...required })).toEqual({
      NODE_ENV: 'development',
      PORT: 9000,
      GATEHOUSE_ISSUER: 'http://localhost:9000',
      DATABASE_URL,
      GATEHOUSE_KEY_ENCRYPTION_KEY,
    });
  });

  it('coerces PORT from string', () => {
    expect(validateEnv({ ...required, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects an invalid PORT', () => {
    expect(() => validateEnv({ ...required, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('rejects an issuer that is not an http(s) URL', () => {
    expect(() =>
      validateEnv({ ...required, GATEHOUSE_ISSUER: 'ftp://auth.example.com' }),
    ).toThrow(/GATEHOUSE_ISSUER/);
  });

  it('rejects an issuer with a trailing slash', () => {
    expect(() =>
      validateEnv({
        ...required,
        GATEHOUSE_ISSUER: 'https://auth.example.com/',
      }),
    ).toThrow(/must not end with/);
  });

  it('requires DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a DATABASE_URL that is not postgres', () => {
    expect(() =>
      validateEnv({
        ...required,
        DATABASE_URL: 'mysql://user:pass@localhost/db',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('requires GATEHOUSE_KEY_ENCRYPTION_KEY', () => {
    expect(() => validateEnv({ DATABASE_URL })).toThrow(
      /GATEHOUSE_KEY_ENCRYPTION_KEY/,
    );
  });

  it.each([
    ['16 bytes', Buffer.alloc(16, 7).toString('base64')],
    ['33 bytes', Buffer.alloc(33, 7).toString('base64')],
    ['32 bytes as base64url', Buffer.alloc(32, 251).toString('base64url')],
    ['a plain passphrase', 'my-super-secret-passphrase'],
  ])('rejects an encryption key with %s', (_case, key) => {
    expect(() =>
      validateEnv({ DATABASE_URL, GATEHOUSE_KEY_ENCRYPTION_KEY: key }),
    ).toThrow(/must be 32 bytes encoded as base64/);
  });

  describe('initial admin', () => {
    const admin = {
      GATEHOUSE_ADMIN_USERNAME: 'admin',
      GATEHOUSE_ADMIN_EMAIL: 'admin@example.com',
      GATEHOUSE_ADMIN_PASSWORD: 'a-long-enough-password',
    };

    it('is optional as a whole', () => {
      expect(validateEnv({ ...required })).not.toHaveProperty(
        'GATEHOUSE_ADMIN_PASSWORD',
      );
    });

    it('accepts the three variables together', () => {
      expect(validateEnv({ ...required, ...admin })).toMatchObject(admin);
    });

    it('requires all three once any of them is set', () => {
      expect(() =>
        validateEnv({
          ...required,
          GATEHOUSE_ADMIN_USERNAME: 'admin',
        }),
      ).toThrow(/GATEHOUSE_ADMIN_EMAIL[\s\S]*GATEHOUSE_ADMIN_PASSWORD/);
    });

    it.each(['GATEHOUSE_ADMIN_USERNAME', 'GATEHOUSE_ADMIN_PASSWORD'])(
      'rejects an empty %s',
      (key) => {
        expect(() => validateEnv({ ...required, ...admin, [key]: '' })).toThrow(
          new RegExp(key),
        );
      },
    );

    it('leaves username format and password strength to the realm rules', () => {
      expect(
        validateEnv({
          ...required,
          ...admin,
          GATEHOUSE_ADMIN_USERNAME: 'admin user',
          GATEHOUSE_ADMIN_PASSWORD: 'short',
        }),
      ).toMatchObject({
        GATEHOUSE_ADMIN_USERNAME: 'admin user',
        GATEHOUSE_ADMIN_PASSWORD: 'short',
      });
    });

    it('rejects an invalid email', () => {
      expect(() =>
        validateEnv({
          ...required,
          ...admin,
          GATEHOUSE_ADMIN_EMAIL: 'not-an-email',
        }),
      ).toThrow(/GATEHOUSE_ADMIN_EMAIL/);
    });

    it('trims the username but never the password', () => {
      const env = validateEnv({
        ...required,
        ...admin,
        GATEHOUSE_ADMIN_USERNAME: '  admin  ',
        GATEHOUSE_ADMIN_PASSWORD: '  spaced password  ',
      });

      expect(env.GATEHOUSE_ADMIN_USERNAME).toBe('admin');
      expect(env.GATEHOUSE_ADMIN_PASSWORD).toBe('  spaced password  ');
    });
  });
});
