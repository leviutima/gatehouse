import { z } from 'zod';

export const userInfoResponseSchema = z.object({
  sub: z.string(),
  preferred_username: z
    .string()
    .optional()
    .meta({ description: 'profile scope' }),
  email: z.string().optional().meta({ description: 'email scope' }),
  email_verified: z.boolean().optional().meta({ description: 'email scope' }),
});
