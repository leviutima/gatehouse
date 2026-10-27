import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class RoleAlreadyExistsError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'role_already_exists';

  constructor(name: string) {
    super(`Role "${name}" already exists in the realm`);
  }
}
