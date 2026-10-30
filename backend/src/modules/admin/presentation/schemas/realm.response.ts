import { z } from 'zod';
import type { Realm } from '../../../realms/domain/entities/realm.entity.js';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';

export const realmResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  displayName: z.string(),
  enabled: z.boolean(),
  loginIdentifier: z.enum(LoginIdentifier),
  passwordMinLength: z.number().int(),
  accessTokenLifespan: z.number().int(),
  sessionIdleTimeout: z.number().int(),
  sessionMaxLifespan: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type RealmResponse = z.infer<typeof realmResponseSchema>;

export function toRealmResponse(realm: Realm): RealmResponse {
  return {
    id: realm.id,
    name: realm.name,
    displayName: realm.displayName,
    enabled: realm.enabled,
    loginIdentifier: realm.loginIdentifier,
    passwordMinLength: realm.passwordMinLength,
    accessTokenLifespan: realm.accessTokenLifespan,
    sessionIdleTimeout: realm.sessionIdleTimeout,
    sessionMaxLifespan: realm.sessionMaxLifespan,
    createdAt: realm.createdAt.toISOString(),
    updatedAt: realm.updatedAt.toISOString(),
  };
}
