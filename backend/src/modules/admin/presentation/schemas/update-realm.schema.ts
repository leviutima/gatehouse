import { z } from 'zod';

export const updateRealmSchema = z
  .strictObject({
    displayName: z.string(),
    enabled: z.boolean(),
    passwordMinLength: z.number().int(),
    sessionIdleTimeout: z.number().int().meta({ description: 'Seconds' }),
    sessionMaxLifespan: z.number().int().meta({ description: 'Seconds' }),
    accessTokenLifespan: z.number().int().meta({ description: 'Seconds' }),
  })
  .partial()
  .meta({
    description:
      'The name and the login identifier cannot change after the realm is created.',
  });

export type UpdateRealmRequest = z.infer<typeof updateRealmSchema>;
