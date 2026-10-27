import { InvalidClientConfigurationError } from './errors/invalid-client-configuration.error.js';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const FORBIDDEN_PROTOCOLS = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
]);

export function assertValidRedirectUri(uri: string): void {
  if (!URL.canParse(uri)) {
    throw new InvalidClientConfigurationError(
      `Redirect URI "${uri}" must be an absolute URI`,
    );
  }
  if (uri.includes('#')) {
    throw new InvalidClientConfigurationError(
      `Redirect URI "${uri}" must not contain a fragment`,
    );
  }
  const { protocol, hostname } = new URL(uri);
  if (FORBIDDEN_PROTOCOLS.has(protocol)) {
    throw new InvalidClientConfigurationError(
      `Redirect URI "${uri}" uses a forbidden scheme`,
    );
  }
  if (protocol === 'http:' && !LOOPBACK_HOSTS.has(hostname)) {
    throw new InvalidClientConfigurationError(
      `Redirect URI "${uri}" must use https unless it points to localhost`,
    );
  }
}
