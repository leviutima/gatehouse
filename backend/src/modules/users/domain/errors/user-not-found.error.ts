import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class UserNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'user_not_found';

  constructor(id: string) {
    super(`User "${id}" not found in the realm`);
  }
}
