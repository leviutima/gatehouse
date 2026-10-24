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
    expect(() => validateEnv({ DATABASE_URL, GATEHOUSE_ISSUER: 'ftp://auth.example.com' })).toThrow(
      /GATEHOUSE_ISSUER/,
    );
  });

  it('rejects an issuer with a trailing slash', () => {
    expect(() => validateEnv({ DATABASE_URL, GATEHOUSE_ISSUER: 'https://auth.example.com/' })).toThrow(
      /must not end with/,
    );
  });

  it('requires DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a DATABASE_URL that is not postgres', () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://user:pass@localhost/db' })).toThrow(/DATABASE_URL/);
  });
});
