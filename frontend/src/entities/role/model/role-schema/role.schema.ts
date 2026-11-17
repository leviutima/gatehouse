import { z } from 'zod'

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
})

export const roleListSchema = z.array(roleSchema)

export type Role = z.infer<typeof roleSchema>
