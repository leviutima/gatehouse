import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class RoleNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'role_not_found';

  constructor(name: string) {
    super(`Role "${name}" not found in the realm`);
  }
}
