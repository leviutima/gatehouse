import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class RealmAlreadyExistsError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'realm_already_exists';

  constructor(name: string) {
    super(`Realm "${name}" already exists`);
  }
}
