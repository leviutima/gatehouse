import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getUser, listUsers } from '../user-api/user-api.ts'
import type { UserPage } from '../user-api/user-api.ts'

export function usersQueryKey(realm: string) {
  return ['realms', realm, 'users'] as const
}

export function userQueryKey(realm: string, userId: string) {
  return ['realms', realm, 'users', userId, 'details'] as const
}

export function useUsersQuery(realm: string, page: UserPage) {
  return useQuery({
    queryKey: [...usersQueryKey(realm), 'page', page.offset, page.limit],
    queryFn: () => listUsers(realm, page),
    placeholderData: keepPreviousData,
  })
}

export function useUserQuery(realm: string, userId: string) {
  return useQuery({
    queryKey: userQueryKey(realm, userId),
    queryFn: () => getUser(realm, userId),
  })
}
