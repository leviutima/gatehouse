import { validateEnv } from './env.schema.js';

describe('validateEnv', () => {
  it('applies defaults when variables are absent', () => {
    expect(validateEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 9000,
      GATEHOUSE_ISSUER: 'http://localhost:9000',
    });
  });

  it('coerces PORT from string', () => {
    expect(validateEnv({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects an invalid PORT', () => {
    expect(() => validateEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });

  it('rejects an issuer that is not an http(s) URL', () => {
    expect(() => validateEnv({ GATEHOUSE_ISSUER: 'ftp://auth.example.com' })).toThrow(/GATEHOUSE_ISSUER/);
  });

  it('rejects an issuer with a trailing slash', () => {
    expect(() => validateEnv({ GATEHOUSE_ISSUER: 'https://auth.example.com/' })).toThrow(/must not end with/);
  });
});
