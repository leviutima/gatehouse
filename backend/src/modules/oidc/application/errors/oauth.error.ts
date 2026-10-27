export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'unauthorized_client'
  | 'unsupported_grant_type';

export class OAuthError extends Error {
  constructor(
    readonly code: OAuthErrorCode,
    readonly description: string,
  ) {
    super(description);
    this.name = new.target.name;
  }

  static invalidRequest(description: string): OAuthError {
    return new OAuthError('invalid_request', description);
  }

  static invalidClient(): OAuthError {
    return new OAuthError('invalid_client', 'Client authentication failed');
  }

  static unauthorizedClient(grantType: string): OAuthError {
    return new OAuthError(
      'unauthorized_client',
      `The client is not allowed to use the ${grantType} grant`,
    );
  }

  static unsupportedGrantType(grantType: string): OAuthError {
    return new OAuthError(
      'unsupported_grant_type',
      `Grant type "${grantType}" is not supported`,
    );
  }
}
