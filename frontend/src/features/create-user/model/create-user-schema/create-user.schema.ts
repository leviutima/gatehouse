import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().trim(),
  email: z.email('Enter a valid email.'),
  password: z.string().min(1, 'Enter a password.'),
})

export type CreateUserValues = z.infer<typeof createUserSchema>
