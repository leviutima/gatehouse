import { InvalidRoleNameError } from './errors/invalid-role-name.error.js';
import { assertValidRoleName } from './role-name.js';

describe('assertValidRoleName', () => {
  it.each([
    'admin',
    'billing:read',
    'Manager',
    'team.sales',
    'a',
    'a'.repeat(64),
  ])('accepts %s', (name) => {
    expect(() => assertValidRoleName(name)).not.toThrow();
  });

  it.each([
    '',
    ' admin',
    'billing read',
    '-admin',
    'admin/root',
    'a'.repeat(65),
  ])('rejects "%s"', (name) => {
    expect(() => assertValidRoleName(name)).toThrow(InvalidRoleNameError);
  });
});
