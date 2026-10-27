import { WeakPasswordError } from './errors/weak-password.error.js';

export const PASSWORD_MAX_LENGTH = 256;

export class PasswordPolicy {
  constructor(
    readonly minLength: number,
    readonly maxLength: number = PASSWORD_MAX_LENGTH,
  ) {}

  assertAllowed(password: string): void {
    const length = Array.from(password).length;
    if (length < this.minLength || length > this.maxLength) {
      throw new WeakPasswordError(this.minLength, this.maxLength);
    }
  }
}
