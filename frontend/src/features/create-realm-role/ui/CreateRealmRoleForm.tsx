import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Field, Input } from '@leviutima/ds'
import { useForm } from 'react-hook-form'
import { apiErrorCode } from '@/shared/api'
import { useCreateRealmRole } from '../api/use-create-realm-role/use-create-realm-role.ts'
import { createRealmRoleSchema } from '../model/create-realm-role-schema/create-realm-role.schema.ts'
import type { CreateRealmRoleValues } from '../model/create-realm-role-schema/create-realm-role.schema.ts'

interface CreateRealmRoleFormProps {
  realm: string
}

export function CreateRealmRoleForm({ realm }: CreateRealmRoleFormProps) {
  const createRole = useCreateRealmRole(realm)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateRealmRoleValues>({
    resolver: zodResolver(createRealmRoleSchema),
    defaultValues: { name: '', description: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createRole.mutateAsync(values)
      reset()
    } catch (error) {
      switch (apiErrorCode(error)) {
        case 'role_already_exists':
          setError('name', { message: 'This realm already has a role with this name.' })
          break
        case 'invalid_role_name':
          setError('name', { message: 'Gatehouse does not accept this name.' })
          break
        default:
          setError('root', { message: 'The role could not be created.' })
      }
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start">
        <Field label="Name" error={errors.name?.message} required>
          <Input
            {...register('name')}
            autoComplete="off"
            placeholder="billing:read"
            className="font-mono"
          />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <Input {...register('description')} autoComplete="off" />
        </Field>
        <Button type="submit" loading={isSubmitting} className="sm:mt-6">
          Create role
        </Button>
      </div>
      {errors.root && <Alert tone="error">{errors.root.message}</Alert>}
    </form>
  )
}
