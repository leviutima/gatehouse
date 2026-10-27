import { InvalidRealmConfigurationError } from './errors/invalid-realm-configuration.error.js';
import { PASSWORD_MAX_LENGTH } from './password-policy.js';

const REALM_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DISPLAY_NAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH_FLOOR = 8;
const ACCESS_TOKEN_LIFESPAN_MIN = 60;
const ACCESS_TOKEN_LIFESPAN_MAX = 24 * 60 * 60;

export interface RealmSettings {
  name: string;
  displayName: string;
  passwordMinLength?: number;
  accessTokenLifespan?: number;
}

export function assertValidRealmSettings({
  name,
  displayName,
  passwordMinLength,
  accessTokenLifespan,
}: RealmSettings): void {
  if (!REALM_NAME_PATTERN.test(name)) {
    throw new InvalidRealmConfigurationError(
      'Realm name must be 1-63 lowercase letters, digits or hyphens, not starting or ending with a hyphen',
    );
  }
  const displayNameLength = displayName.trim().length;
  if (displayNameLength === 0 || displayNameLength > DISPLAY_NAME_MAX_LENGTH) {
    throw new InvalidRealmConfigurationError(
      `Display name must have 1-${DISPLAY_NAME_MAX_LENGTH} characters`,
    );
  }
  if (
    passwordMinLength !== undefined &&
    !isIntegerBetween(
      passwordMinLength,
      PASSWORD_MIN_LENGTH_FLOOR,
      PASSWORD_MAX_LENGTH,
    )
  ) {
    throw new InvalidRealmConfigurationError(
      `Password minimum length must be between ${PASSWORD_MIN_LENGTH_FLOOR} and ${PASSWORD_MAX_LENGTH}`,
    );
  }
  if (
    accessTokenLifespan !== undefined &&
    !isIntegerBetween(
      accessTokenLifespan,
      ACCESS_TOKEN_LIFESPAN_MIN,
      ACCESS_TOKEN_LIFESPAN_MAX,
    )
  ) {
    throw new InvalidRealmConfigurationError(
      `Access token lifespan must be between ${ACCESS_TOKEN_LIFESPAN_MIN} and ${ACCESS_TOKEN_LIFESPAN_MAX} seconds`,
    );
  }
}

function isIntegerBetween(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
