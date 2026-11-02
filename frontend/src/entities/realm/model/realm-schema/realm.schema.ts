import { z } from 'zod'

export const realmSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  enabled: z.boolean(),
})

export const realmListSchema = z.array(realmSchema)

export type Realm = z.infer<typeof realmSchema>
