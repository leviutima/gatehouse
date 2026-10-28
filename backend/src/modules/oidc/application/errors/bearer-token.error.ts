export type BearerErrorCode = 'invalid_token' | 'insufficient_scope';

export class BearerTokenError extends Error {
  constructor(
    readonly code: BearerErrorCode,
    readonly description: string,
  ) {
    super(description);
    this.name = new.target.name;
  }

  static invalidToken(): BearerTokenError {
    return new BearerTokenError(
      'invalid_token',
      'The access token does not identify a user of this realm',
    );
  }

  static insufficientScope(scope: string): BearerTokenError {
    return new BearerTokenError(
      'insufficient_scope',
      `The access token lacks the ${scope} scope`,
    );
  }
}
