import { z } from 'zod'

export const envSchema = z.object({
  VITE_GATEHOUSE_ISSUER: z.url({ protocol: /^https?$/ }),
})

export const env = envSchema.parse(import.meta.env)
