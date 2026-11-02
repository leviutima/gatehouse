import { InvalidClientConfigurationError } from './errors/invalid-client-configuration.error.js';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function assertValidWebOrigin(origin: string): void {
  const url = URL.canParse(origin) ? new URL(origin) : null;
  if (
    !url ||
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.origin !== origin
  ) {
    throw new InvalidClientConfigurationError(
      `Web origin "${origin}" must be a scheme, host and optional port, like https://app.example.com`,
    );
  }
  if (url.protocol === 'http:' && !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new InvalidClientConfigurationError(
      `Web origin "${origin}" must use https unless it points to localhost`,
    );
  }
}
