import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class MasterAdminNotConfiguredError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'master_admin_not_configured';

  constructor() {
    super(
      'The master realm does not exist yet: set GATEHOUSE_ADMIN_USERNAME, GATEHOUSE_ADMIN_EMAIL and GATEHOUSE_ADMIN_PASSWORD to create it',
    );
  }
}
