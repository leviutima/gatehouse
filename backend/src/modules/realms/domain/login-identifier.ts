export const LoginIdentifier = {
  USERNAME: 'USERNAME',
  EMAIL: 'EMAIL',
  USERNAME_OR_EMAIL: 'USERNAME_OR_EMAIL',
} as const;

export type LoginIdentifier =
  (typeof LoginIdentifier)[keyof typeof LoginIdentifier];
