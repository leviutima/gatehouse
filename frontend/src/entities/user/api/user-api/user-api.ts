import { adminHttp } from '@/shared/api'
import { userListSchema, userSchema } from '../../model/user-schema/user.schema.ts'
import type { User } from '../../model/user-schema/user.schema.ts'

export interface UserPage {
  offset: number
  limit: number
}

export interface NewUser {
  username?: string
  email: string
  password: string
}

export interface UserStatus {
  enabled: boolean
  emailVerified: boolean
}

function usersPath(realm: string): string {
  return `/admin/realms/${encodeURIComponent(realm)}/users`
}

function userPath(realm: string, userId: string): string {
  return `${usersPath(realm)}/${encodeURIComponent(userId)}`
}

export async function listUsers(
  realm: string,
  page: UserPage,
): Promise<User[]> {
  const response = await adminHttp.get<unknown>(usersPath(realm), {
    params: page,
  })
  return userListSchema.parse(response.data)
}

export async function getUser(realm: string, userId: string): Promise<User> {
  const response = await adminHttp.get<unknown>(userPath(realm, userId))
  return userSchema.parse(response.data)
}

export async function createUser(realm: string, user: NewUser): Promise<User> {
  const response = await adminHttp.post<unknown>(usersPath(realm), user)
  return userSchema.parse(response.data)
}

export async function updateUser(
  realm: string,
  userId: string,
  changes: Partial<UserStatus>,
): Promise<User> {
  const response = await adminHttp.patch<unknown>(
    userPath(realm, userId),
    changes,
  )
  return userSchema.parse(response.data)
}

export async function setUserPassword(
  realm: string,
  userId: string,
  password: string,
): Promise<void> {
  await adminHttp.put(`${userPath(realm, userId)}/password`, { password })
}
