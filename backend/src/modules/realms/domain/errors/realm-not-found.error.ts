import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class RealmNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'realm_not_found';

  constructor(name: string) {
    super(`Realm "${name}" not found`);
  }
}
