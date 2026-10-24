import { z } from 'zod';

/**
 * Every environment variable Gatehouse reads. Validated once at startup:
 * if anything is missing or malformed the process refuses to boot.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(9000),
  // Public URL of Gatehouse. Goes into the "iss" claim of every token and is
  // what client apps compare against, so it must match exactly (no trailing slash).
  GATEHOUSE_ISSUER: z
    .url({ protocol: /^https?$/ })
    .refine((value) => !value.endsWith('/'), 'must not end with "/"')
    .default('http://localhost:9000'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
