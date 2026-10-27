import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class PublicClientHasNoSecretError extends DomainError {
  readonly kind = 'invalid';
  readonly code = 'public_client_has_no_secret';

  constructor(clientId: string) {
    super(`Client "${clientId}" is public and has no secret to rotate`);
  }
}
