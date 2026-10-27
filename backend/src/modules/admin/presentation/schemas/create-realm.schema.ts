import { z } from 'zod';
import { LoginIdentifier } from '../../../realms/domain/login-identifier.js';

export const createRealmSchema = z.object({
  name: z.string().meta({ example: 'shop' }),
  displayName: z.string().meta({ example: 'Shop' }),
  loginIdentifier: z.enum(LoginIdentifier).optional(),
  passwordMinLength: z.number().int().optional(),
  accessTokenLifespan: z
    .number()
    .int()
    .optional()
    .meta({ description: 'Seconds' }),
  admin: z
    .object({
      username: z.string().optional(),
      email: z.email(),
      password: z.string(),
    })
    .optional()
    .meta({ description: 'First admin of the new realm' }),
});

export type CreateRealmRequest = z.infer<typeof createRealmSchema>;
