import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidUsernameError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'invalid_username';

  constructor() {
    super(
      'Username must be 3 to 64 characters long and use only letters, digits, ".", "_" and "-"',
    );
  }
}
