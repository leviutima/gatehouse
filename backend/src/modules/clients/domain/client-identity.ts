import { InvalidClientConfigurationError } from './errors/invalid-client-configuration.error.js';

const CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const NAME_MAX_LENGTH = 100;

export function assertValidClientId(clientId: string): void {
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    throw new InvalidClientConfigurationError(
      'Client id must be 1-100 letters, digits, dots, underscores, colons or hyphens, starting with a letter or digit',
    );
  }
}

export function assertValidClientName(name: string): void {
  const length = name.trim().length;
  if (length === 0 || length > NAME_MAX_LENGTH) {
    throw new InvalidClientConfigurationError(
      `Client name must have 1-${NAME_MAX_LENGTH} characters`,
    );
  }
}
