import { z } from 'zod';

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int(),
  id_token: z
    .string()
    .optional()
    .meta({ description: 'authorization_code with the openid scope' }),
  refresh_token: z.string().optional().meta({
    description: 'For clients allowed to use the refresh_token grant',
  }),
  scope: z.string().optional(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;
