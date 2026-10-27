import type { Realm } from '../../realms/domain/entities/realm.entity.js';
import { InvalidUsernameError } from './errors/invalid-username.error.js';
import { UsernameRequiredError } from './errors/username-required.error.js';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,64}$/;

export interface UsernameInput {
  username?: string;
  email: string;
}

export function assertValidUsername(username: string): void {
  if (!USERNAME_PATTERN.test(username)) {
    throw new InvalidUsernameError();
  }
}

export function resolveUsername(realm: Realm, input: UsernameInput): string {
  if (realm.usesEmailAsUsername) {
    return input.email;
  }
  if (!input.username) {
    throw new UsernameRequiredError();
  }
  assertValidUsername(input.username);
  return input.username;
}
