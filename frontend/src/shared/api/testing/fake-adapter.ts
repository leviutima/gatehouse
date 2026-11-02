import { AxiosError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'

export interface FakeResponse {
  status: number
  data?: unknown
}

export type FakeHandler = (
  config: InternalAxiosRequestConfig,
) => FakeResponse | Promise<FakeResponse>

export function fakeAdapter(handler: FakeHandler): AxiosAdapter {
  return async (config) => {
    const { status, data } = await handler(config)
    const response = { status, data, statusText: '', headers: {}, config }
    if (status >= 200 && status < 300) {
      return response
    }
    throw new AxiosError(
      `HTTP ${status}`,
      AxiosError.ERR_BAD_RESPONSE,
      config,
      null,
      response,
    )
  }
}
