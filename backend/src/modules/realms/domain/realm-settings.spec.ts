import { InvalidRealmConfigurationError } from './errors/invalid-realm-configuration.error.js';
import { assertValidRealmSettings, RealmSettings } from './realm-settings.js';

const valid: RealmSettings = {
  name: 'shop-eu',
  displayName: 'Shop EU',
  passwordMinLength: 12,
  accessTokenLifespan: 300,
};

describe('assertValidRealmSettings', () => {
  it('accepts valid settings', () => {
    expect(() => assertValidRealmSettings(valid)).not.toThrow();
  });

  it('accepts settings that leave the defaults', () => {
    expect(() =>
      assertValidRealmSettings({ name: 'a', displayName: 'A' }),
    ).not.toThrow();
  });

  it.each([
    ['an empty name', { name: '' }],
    ['uppercase letters', { name: 'Shop' }],
    ['a leading hyphen', { name: '-shop' }],
    ['a trailing hyphen', { name: 'shop-' }],
    ['a slash', { name: 'shop/eu' }],
    ['a dot', { name: 'shop.eu' }],
    ['a name longer than 63', { name: 'a'.repeat(64) }],
    ['a blank display name', { displayName: '   ' }],
    ['a display name longer than 100', { displayName: 'a'.repeat(101) }],
    ['a password minimum below 8', { passwordMinLength: 7 }],
    ['a password minimum above 256', { passwordMinLength: 257 }],
    ['a fractional password minimum', { passwordMinLength: 12.5 }],
    ['a lifespan below one minute', { accessTokenLifespan: 59 }],
    ['a lifespan above one day', { accessTokenLifespan: 86401 }],
    ['a session idle timeout below 5 minutes', { sessionIdleTimeout: 299 }],
    [
      'a session max lifespan above 30 days',
      { sessionMaxLifespan: 30 * 24 * 60 * 60 + 1 },
    ],
    [
      'an idle timeout longer than the max lifespan',
      { sessionIdleTimeout: 7200, sessionMaxLifespan: 3600 },
    ],
  ])('rejects %s', (_case, overrides) => {
    expect(() => assertValidRealmSettings({ ...valid, ...overrides })).toThrow(
      InvalidRealmConfigurationError,
    );
  });

  it('accepts a name of exactly 63 characters', () => {
    expect(() =>
      assertValidRealmSettings({ ...valid, name: 'a'.repeat(63) }),
    ).not.toThrow();
  });
});
