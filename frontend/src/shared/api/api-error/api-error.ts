import { isAxiosError } from 'axios'
import { z } from 'zod'

const apiErrorSchema = z.object({ error: z.string(), message: z.string() })

function apiErrorBody(error: unknown) {
  if (!isAxiosError(error)) {
    return undefined
  }
  const parsed = apiErrorSchema.safeParse(error.response?.data)
  return parsed.success ? parsed.data : undefined
}

export function apiErrorCode(error: unknown): string | undefined {
  return apiErrorBody(error)?.error
}

export function apiErrorMessage(error: unknown): string | undefined {
  return apiErrorBody(error)?.message
}
