import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ClientAlreadyExistsError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'client_already_exists';

  constructor(clientId: string) {
    super(`Client "${clientId}" already exists in the realm`);
  }
}
