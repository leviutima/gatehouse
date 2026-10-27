export const SigningKeyStatus = {
  ACTIVE: 'ACTIVE',
  PASSIVE: 'PASSIVE',
} as const;

export type SigningKeyStatus =
  (typeof SigningKeyStatus)[keyof typeof SigningKeyStatus];
