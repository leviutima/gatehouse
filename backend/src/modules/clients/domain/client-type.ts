export const ClientType = {
  PUBLIC: 'PUBLIC',
  CONFIDENTIAL: 'CONFIDENTIAL',
} as const;

export type ClientType = (typeof ClientType)[keyof typeof ClientType];
