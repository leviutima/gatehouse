export const OPENID_SCOPE = 'openid';

export const SUPPORTED_SCOPES: readonly string[] = [
  OPENID_SCOPE,
  'profile',
  'email',
];

export function parseScope(scope: string | undefined): string[] | null {
  const requested = [...new Set((scope ?? '').split(' ').filter(Boolean))];
  return requested.every((value) => SUPPORTED_SCOPES.includes(value))
    ? requested
    : null;
}
