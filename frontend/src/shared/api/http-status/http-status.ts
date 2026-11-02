import { isAxiosError } from 'axios'

export function hasHttpStatus(error: unknown, status: number): boolean {
  return isAxiosError(error) && error.response?.status === status
}
