import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  enabled: z.boolean(),
})

export const userListSchema = z.array(userSchema)

export type User = z.infer<typeof userSchema>
