import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class LastRealmAdminError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'last_realm_admin';

  constructor(realmName: string) {
    super(`The realm "${realmName}" would be left without an enabled admin`);
  }
}
