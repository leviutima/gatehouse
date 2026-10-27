import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidRealmConfigurationError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'invalid_realm_configuration';
}
