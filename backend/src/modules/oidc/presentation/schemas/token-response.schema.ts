import { z } from 'zod';

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;
