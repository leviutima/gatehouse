import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class MasterRealmCannotBeDisabledError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'master_realm_cannot_be_disabled';

  constructor() {
    super('The master realm cannot be disabled');
  }
}
