import { z } from 'zod';

const ADMIN_KEYS = [
  'GATEHOUSE_ADMIN_USERNAME',
  'GATEHOUSE_ADMIN_EMAIL',
  'GATEHOUSE_ADMIN_PASSWORD',
] as const;

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(9000),
    GATEHOUSE_ISSUER: z
      .url({ protocol: /^https?$/ })
      .refine((value) => !value.endsWith('/'), 'must not end with "/"')
      .default('http://localhost:9000'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    GATEHOUSE_KEY_ENCRYPTION_KEY: z
      .string()
      .regex(/^[A-Za-z0-9+/]{43}=$/, 'must be 32 bytes encoded as base64'),
    GATEHOUSE_ADMIN_USERNAME: z.string().trim().min(1).optional(),
    GATEHOUSE_ADMIN_EMAIL: z.email().optional(),
    GATEHOUSE_ADMIN_PASSWORD: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    const missing = ADMIN_KEYS.filter((key) => env[key] === undefined);
    if (missing.length === 0 || missing.length === ADMIN_KEYS.length) {
      return;
    }
    for (const key of missing) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: 'required when any GATEHOUSE_ADMIN_* variable is set',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
