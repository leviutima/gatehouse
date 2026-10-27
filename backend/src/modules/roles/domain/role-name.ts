import { InvalidRoleNameError } from './errors/invalid-role-name.error.js';

const ROLE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export function assertValidRoleName(name: string): void {
  if (!ROLE_NAME_PATTERN.test(name)) {
    throw new InvalidRoleNameError();
  }
}
