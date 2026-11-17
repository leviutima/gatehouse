import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Field, Input } from '@leviutima/ds'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { setUserPassword } from '@/entities/user'
import { apiErrorCode, apiErrorMessage } from '@/shared/api'

const passwordSchema = z.object({
  password: z.string().min(1, 'Enter a password.'),
})

type PasswordValues = z.infer<typeof passwordSchema>

interface SetUserPasswordFormProps {
  realm: string
  userId: string
}

export function SetUserPasswordForm({ realm, userId }: SetUserPasswordFormProps) {
  const save = useMutation({
    mutationFn: ({ password }: PasswordValues) =>
      setUserPassword(realm, userId, password),
  })
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values)
      reset({ password: '' })
    } catch (error) {
      const message = apiErrorMessage(error)
      if (apiErrorCode(error) === 'weak_password') {
        setError('password', { message })
        return
      }
      setError('root', { message: message ?? 'The password could not be changed.' })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-3">
      <div className="flex items-start gap-3">
        <Field label="New password" error={errors.password?.message} className="flex-1">
          <Input {...register('password')} type="password" autoComplete="new-password" />
        </Field>
        <Button type="submit" variant="secondary" loading={isSubmitting} className="mt-6">
          Set password
        </Button>
      </div>
      {save.isSuccess && (
        <p className="text-sm text-muted-foreground" role="status">
          Password changed.
        </p>
      )}
      {errors.root && <Alert tone="error">{errors.root.message}</Alert>}
    </form>
  )
}
