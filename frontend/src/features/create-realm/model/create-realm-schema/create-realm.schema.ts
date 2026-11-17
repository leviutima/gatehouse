import { z } from 'zod'
import { loginIdentifiers } from '@/entities/realm'
import type { NewRealm } from '@/entities/realm'

export const createRealmSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name.'),
    displayName: z.string().trim().min(1, 'Enter a display name.'),
    loginIdentifier: z.enum(loginIdentifiers),
    withAdmin: z.boolean(),
    adminUsername: z.string().trim(),
    adminEmail: z.string().trim(),
    adminPassword: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.withAdmin) {
      return
    }
    if (values.loginIdentifier !== 'EMAIL' && !values.adminUsername) {
      context.addIssue({
        code: 'custom',
        path: ['adminUsername'],
        message: 'Enter a username.',
      })
    }
    if (!z.email().safeParse(values.adminEmail).success) {
      context.addIssue({
        code: 'custom',
        path: ['adminEmail'],
        message: 'Enter a valid email.',
      })
    }
    if (!values.adminPassword) {
      context.addIssue({
        code: 'custom',
        path: ['adminPassword'],
        message: 'Enter a password.',
      })
    }
  })

export type CreateRealmValues = z.infer<typeof createRealmSchema>

export const emptyRealmForm: CreateRealmValues = {
  name: '',
  displayName: '',
  loginIdentifier: 'USERNAME_OR_EMAIL',
  withAdmin: false,
  adminUsername: '',
  adminEmail: '',
  adminPassword: '',
}

export function toNewRealm(values: CreateRealmValues): NewRealm {
  const realm: NewRealm = {
    name: values.name,
    displayName: values.displayName,
    loginIdentifier: values.loginIdentifier,
  }
  if (!values.withAdmin) {
    return realm
  }
  return {
    ...realm,
    admin: {
      username:
        values.loginIdentifier === 'EMAIL' ? undefined : values.adminUsername,
      email: values.adminEmail,
      password: values.adminPassword,
    },
  }
}
