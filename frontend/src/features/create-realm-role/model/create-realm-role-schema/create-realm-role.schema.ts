import { z } from 'zod'

const ROLE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/

export const createRealmRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Enter a name.')
    .regex(
      ROLE_NAME_PATTERN,
      'Use up to 64 letters, digits, dots, underscores, colons or hyphens, starting with a letter or digit.',
    ),
  description: z.string().max(255, 'Keep it under 256 characters.'),
})

export type CreateRealmRoleValues = z.infer<typeof createRealmRoleSchema>
