import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Field, Input } from '@leviutima/ds'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { createUser, usersQueryKey } from '@/entities/user'
import type { User } from '@/entities/user'
import { apiErrorCode, apiErrorMessage } from '@/shared/api'
import { createUserSchema } from '../model/create-user-schema/create-user.schema.ts'
import type { CreateUserValues } from '../model/create-user-schema/create-user.schema.ts'

interface CreateUserFormProps {
  realm: string
  askUsername: boolean
  onCreated(user: User): void
}

export function CreateUserForm({ realm, askUsername, onCreated }: CreateUserFormProps) {
  const queryClient = useQueryClient()
  const create = useMutation({
    mutationFn: ({ username, email, password }: CreateUserValues) =>
      createUser(realm, {
        username: askUsername ? username : undefined,
        email,
        password,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey(realm) }),
  })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: '', email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      onCreated(await create.mutateAsync(values))
    } catch (error) {
      const message = apiErrorMessage(error)
      switch (apiErrorCode(error)) {
        case 'username_required':
        case 'invalid_username':
          setError('username', { message })
          break
        case 'weak_password':
          setError('password', { message })
          break
        case 'user_already_exists':
          setError('root', { message: 'This realm already has a user with this username or email.' })
          break
        default:
          setError('root', { message: message ?? 'The user could not be created.' })
      }
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-4">
      {askUsername && (
        <Field label="Username" error={errors.username?.message} required>
          <Input {...register('username')} autoComplete="off" />
        </Field>
      )}
      <Field label="Email" error={errors.email?.message} required>
        <Input {...register('email')} type="email" autoComplete="off" />
      </Field>
      <Field label="Password" error={errors.password?.message} required>
        <Input {...register('password')} type="password" autoComplete="new-password" />
      </Field>
      {errors.root && <Alert tone="error">{errors.root.message}</Alert>}
      <div>
        <Button type="submit" loading={isSubmitting}>
          Create user
        </Button>
      </div>
    </form>
  )
}
