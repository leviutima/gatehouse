import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class UsernameRequiredError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'username_required';

  constructor() {
    super('This realm requires a username');
  }
}
