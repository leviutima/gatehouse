import { isAxiosError } from 'axios'
import { z } from 'zod'

const apiErrorSchema = z.object({ error: z.string() })

export function apiErrorCode(error: unknown): string | undefined {
  if (!isAxiosError(error)) {
    return undefined
  }
  const parsed = apiErrorSchema.safeParse(error.response?.data)
  return parsed.success ? parsed.data.error : undefined
}
