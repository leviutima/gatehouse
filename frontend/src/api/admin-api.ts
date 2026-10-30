import { SessionExpiredError } from '../auth/auth-session.ts'
import type { AuthSession } from '../auth/auth-session.ts'

export interface Realm {
  id: string
  name: string
  displayName: string
  enabled: boolean
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`The Gatehouse API answered with HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
  }
}

export class AdminApi {
  private readonly baseUrl: string
  private readonly session: AuthSession

  constructor(baseUrl: string, session: AuthSession) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.session = session
  }

  listRealms(): Promise<Realm[]> {
    return this.get<Realm[]>('/admin/realms')
  }

  private async get<T>(path: string): Promise<T> {
    try {
      let response = await this.send(path, await this.session.validAccessToken())
      if (response.status === 401) {
        response = await this.send(path, await this.session.renewAccessToken())
      }
      if (response.status === 401) {
        throw new SessionExpiredError()
      }
      if (!response.ok) {
        throw new ApiError(response.status)
      }
      return (await response.json()) as T
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        await this.session.redirectToLogin()
      }
      throw error
    }
  }

  private send(path: string, accessToken: string): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }
}
