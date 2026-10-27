import { z } from 'zod';

export const oauthErrorResponseSchema = z.object({
  error: z.enum([
    'invalid_request',
    'invalid_client',
    'unauthorized_client',
    'unsupported_grant_type',
  ]),
  error_description: z.string(),
});
