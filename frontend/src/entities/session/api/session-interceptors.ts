import axios, { isAxiosError } from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { hasHttpStatus } from '@/shared/api'
import { SessionExpiredError } from '../model/auth-session.ts'
import type { AuthSession } from '../model/auth-session.ts'

export function installSessionInterceptors(
  http: AxiosInstance,
  session: AuthSession,
): void {
  http.interceptors.request.use(async (config) => {
    config.headers.set(
      'Authorization',
      `Bearer ${await session.validAccessToken()}`,
    )
    return config
  })

  http.interceptors.response.use(undefined, async (error: unknown) => {
    try {
      return await retryWithRenewedToken(error, session)
    } catch (failure) {
      if (failure instanceof SessionExpiredError) {
        await session.redirectToLogin()
      }
      throw failure
    }
  })
}

async function retryWithRenewedToken(
  error: unknown,
  session: AuthSession,
): Promise<AxiosResponse> {
  if (!isAxiosError(error) || !error.config || !hasHttpStatus(error, 401)) {
    throw error
  }
  const accessToken = await session.renewAccessToken()
  error.config.headers.set('Authorization', `Bearer ${accessToken}`)
  try {
    return await axios.request(error.config)
  } catch (retryError) {
    if (hasHttpStatus(retryError, 401)) {
      throw new SessionExpiredError()
    }
    throw retryError
  }
}
