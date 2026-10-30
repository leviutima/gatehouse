import { z } from 'zod';

export const tokenRequestSchema = z.object({
  grant_type: z.string().min(1).meta({
    description: 'client_credentials, authorization_code or refresh_token',
    example: 'authorization_code',
  }),
  client_id: z.string().min(1).optional().meta({
    description: 'client_secret_post, or a public client identifying itself',
  }),
  client_secret: z
    .string()
    .min(1)
    .optional()
    .meta({ description: 'client_secret_post only' }),
  scope: z.string().optional(),
  code: z
    .string()
    .min(1)
    .optional()
    .meta({ description: 'authorization_code only' }),
  redirect_uri: z
    .string()
    .min(1)
    .optional()
    .meta({ description: 'authorization_code only' }),
  refresh_token: z
    .string()
    .min(1)
    .optional()
    .meta({ description: 'refresh_token only' }),
  code_verifier: z
    .string()
    .min(1)
    .optional()
    .meta({ description: 'authorization_code only: the PKCE verifier' }),
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;
