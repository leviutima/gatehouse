import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidClientConfigurationError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'invalid_client_configuration';
}
