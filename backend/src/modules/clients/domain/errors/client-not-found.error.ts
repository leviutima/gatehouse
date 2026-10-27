import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ClientNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'client_not_found';

  constructor(clientId: string) {
    super(`Client "${clientId}" not found in the realm`);
  }
}
