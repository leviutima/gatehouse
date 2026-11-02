import type { ClientCredentials } from '../../../clients/application/services/client-authenticator.js';
import { OAuthError } from '../../application/errors/oauth.error.js';
import {
  TokenRequest,
  tokenRequestSchema,
} from '../schemas/token-request.schema.js';

const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded';

export function assertFormEncoded(contentType: string | undefined): void {
  const mediaType = contentType?.split(';')[0].trim().toLowerCase();
  if (mediaType !== FORM_CONTENT_TYPE) {
    throw OAuthError.invalidRequest(
      `The token request must be sent as ${FORM_CONTENT_TYPE}`,
    );
  }
}

export function parseTokenRequest(body: unknown): TokenRequest {
  const result = tokenRequestSchema.safeParse(body);
  if (!result.success) {
    const [issue] = result.error.issues;
    const field = issue.path.map(String).join('.') || 'body';
    throw OAuthError.invalidRequest(`Invalid or repeated parameter "${field}"`);
  }
  return result.data;
}

export function resolveClientCredentials(
  authorization: string | undefined,
  request: TokenRequest,
): ClientCredentials {
  const basic = parseBasicCredentials(authorization);
  if (basic) {
    if (request.client_secret !== undefined) {
      throw OAuthError.invalidRequest(
        'Use only one client authentication method',
      );
    }
    if (
      request.client_id !== undefined &&
      request.client_id !== basic.clientId
    ) {
      throw OAuthError.invalidRequest(
        'client_id does not match the authenticated client',
      );
    }
    return basic;
  }
  if (request.client_id !== undefined) {
    return {
      clientId: request.client_id,
      clientSecret: request.client_secret ?? null,
    };
  }
  throw OAuthError.invalidClient();
}

function parseBasicCredentials(
  authorization: string | undefined,
): ClientCredentials | null {
  const [scheme, value, ...rest] = authorization?.trim().split(/\s+/) ?? [];
  if (scheme?.toLowerCase() !== 'basic') {
    return null;
  }
  if (!value || rest.length > 0) {
    throw OAuthError.invalidClient();
  }
  const decoded = Buffer.from(value, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator <= 0) {
    throw OAuthError.invalidClient();
  }
  return {
    clientId: formDecode(decoded.slice(0, separator)),
    clientSecret: formDecode(decoded.slice(separator + 1)),
  };
}

function formDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    throw OAuthError.invalidClient();
  }
}
