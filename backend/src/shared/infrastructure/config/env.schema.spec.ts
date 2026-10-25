import { validateEnv } from './env.schema.js';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

describe('validateEnv', () => {
  it('applies defaults when optional variables are absent', () => {
    expect(validateEnv({ DATABASE_URL })).toEqual({
      NODE_ENV: 'development',
      PORT: 9000,
      GATEHOUSE_ISSUER: 'http://localhost:9000',
      DATABASE_URL,
    });
  });

  it('coerces PORT from string', () => {
    expect(validateEnv({ DATABASE_URL, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects an invalid PORT', () => {
    expect(() => validateEnv({ DATABASE_URL, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('rejects an issuer that is not an http(s) URL', () => {
    expect(() =>
      validateEnv({ DATABASE_URL, GATEHOUSE_ISSUER: 'ftp://auth.example.com' }),
    ).toThrow(/GATEHOUSE_ISSUER/);
  });

  it('rejects an issuer with a trailing slash', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL,
        GATEHOUSE_ISSUER: 'https://auth.example.com/',
      }),
    ).toThrow(/must not end with/);
  });

  it('requires DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a DATABASE_URL that is not postgres', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'mysql://user:pass@localhost/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  describe('initial admin', () => {
    const admin = {
      GATEHOUSE_ADMIN_USERNAME: 'admin',
      GATEHOUSE_ADMIN_EMAIL: 'admin@example.com',
      GATEHOUSE_ADMIN_PASSWORD: 'a-long-enough-password',
    };

    it('is optional as a whole', () => {
      expect(validateEnv({ DATABASE_URL })).not.toHaveProperty(
        'GATEHOUSE_ADMIN_PASSWORD',
      );
    });

    it('accepts the three variables together', () => {
      expect(validateEnv({ DATABASE_URL, ...admin })).toMatchObject(admin);
    });

    it('requires all three once any of them is set', () => {
      expect(() =>
        validateEnv({
          DATABASE_URL,
          GATEHOUSE_ADMIN_USERNAME: 'admin',
        }),
      ).toThrow(/GATEHOUSE_ADMIN_EMAIL[\s\S]*GATEHOUSE_ADMIN_PASSWORD/);
    });

    it('rejects a password shorter than 12 characters', () => {
      expect(() =>
        validateEnv({
          DATABASE_URL,
          ...admin,
          GATEHOUSE_ADMIN_PASSWORD: 'short-pass1',
        }),
      ).toThrow(/GATEHOUSE_ADMIN_PASSWORD/);
    });

    it('rejects an invalid email', () => {
      expect(() =>
        validateEnv({
          DATABASE_URL,
          ...admin,
          GATEHOUSE_ADMIN_EMAIL: 'not-an-email',
        }),
      ).toThrow(/GATEHOUSE_ADMIN_EMAIL/);
    });

    it('rejects a username with unsupported characters', () => {
      expect(() =>
        validateEnv({
          DATABASE_URL,
          ...admin,
          GATEHOUSE_ADMIN_USERNAME: 'admin user',
        }),
      ).toThrow(/GATEHOUSE_ADMIN_USERNAME/);
    });

    it('trims the username but never the password', () => {
      const env = validateEnv({
        DATABASE_URL,
        ...admin,
        GATEHOUSE_ADMIN_USERNAME: '  admin  ',
        GATEHOUSE_ADMIN_PASSWORD: '  spaced password  ',
      });

      expect(env.GATEHOUSE_ADMIN_USERNAME).toBe('admin');
      expect(env.GATEHOUSE_ADMIN_PASSWORD).toBe('  spaced password  ');
    });
  });
});
