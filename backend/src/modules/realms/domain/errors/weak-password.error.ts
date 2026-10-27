import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class WeakPasswordError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'weak_password';

  constructor(minLength: number, maxLength: number) {
    super(
      `Password must be between ${minLength} and ${maxLength} characters long`,
    );
  }
}
