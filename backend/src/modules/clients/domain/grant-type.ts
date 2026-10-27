export const GrantType = {
  AUTHORIZATION_CODE: 'AUTHORIZATION_CODE',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  CLIENT_CREDENTIALS: 'CLIENT_CREDENTIALS',
} as const;

export type GrantType = (typeof GrantType)[keyof typeof GrantType];
