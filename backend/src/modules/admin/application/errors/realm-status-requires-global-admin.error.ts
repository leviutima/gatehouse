import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class RealmStatusRequiresGlobalAdminError extends DomainError {
  readonly kind = 'forbidden';
  readonly code = 'realm_status_requires_global_admin';

  constructor() {
    super('Only an admin of the master realm can enable or disable a realm');
  }
}
