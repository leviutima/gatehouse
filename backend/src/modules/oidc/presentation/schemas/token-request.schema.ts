import { z } from 'zod';

export const tokenRequestSchema = z.object({
  grant_type: z
    .string()
    .min(1)
    .meta({
      description: 'Only client_credentials for now',
      example: 'client_credentials',
    }),
  client_id: z
    .string()
    .min(1)
    .optional()
    .meta({ description: 'client_secret_post only' }),
  client_secret: z
    .string()
    .min(1)
    .optional()
    .meta({ description: 'client_secret_post only' }),
  scope: z.string().optional(),
});

export type TokenRequest = z.infer<typeof tokenRequestSchema>;
