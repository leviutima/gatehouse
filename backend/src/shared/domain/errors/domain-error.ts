export type DomainErrorKind =
  'invalid' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict';

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
