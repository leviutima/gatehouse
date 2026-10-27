import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ReservedRoleError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'reserved_role';

  constructor(name: string) {
    super(`Role "${name}" is reserved by Gatehouse and cannot be deleted`);
  }
}
