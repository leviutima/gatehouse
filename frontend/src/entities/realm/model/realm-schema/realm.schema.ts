import { z } from 'zod'

export const loginIdentifiers = ['USERNAME', 'EMAIL', 'USERNAME_OR_EMAIL'] as const

export const realmSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  enabled: z.boolean(),
  loginIdentifier: z.enum(loginIdentifiers),
  passwordMinLength: z.number(),
  accessTokenLifespan: z.number(),
  sessionIdleTimeout: z.number(),
  sessionMaxLifespan: z.number(),
})

export const realmListSchema = z.array(realmSchema)

export type Realm = z.infer<typeof realmSchema>

export type LoginIdentifier = Realm['loginIdentifier']
