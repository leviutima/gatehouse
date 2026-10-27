import { z } from 'zod';

export const jwkSetResponseSchema = z.object({
  keys: z.array(
    z.object({
      kty: z.literal('EC'),
      crv: z.literal('P-256'),
      x: z.string(),
      y: z.string(),
      kid: z.string(),
      alg: z.string(),
      use: z.literal('sig'),
    }),
  ),
});

export type JwkSetResponse = z.infer<typeof jwkSetResponseSchema>;
