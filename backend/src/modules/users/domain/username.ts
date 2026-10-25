import { InvalidUsernameError } from './errors/invalid-username.error.js';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;

export function assertValidUsername(username: string): void {
  if (!USERNAME_PATTERN.test(username)) {
    throw new InvalidUsernameError();
  }
}
