import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidRoleNameError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'invalid_role_name';

  constructor() {
    super(
      'Role name must be 1-64 letters, digits, dots, underscores, colons or hyphens, starting with a letter or digit',
    );
  }
}
