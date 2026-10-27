import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ActiveSigningKeyAlreadyExistsError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'active_signing_key_already_exists';

  constructor() {
    super('The realm already has an active signing key');
  }
}
