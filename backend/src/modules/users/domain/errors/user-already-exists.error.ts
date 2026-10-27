import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class UserAlreadyExistsError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'user_already_exists';

  constructor() {
    super('A user with this username or email already exists in the realm');
  }
}
