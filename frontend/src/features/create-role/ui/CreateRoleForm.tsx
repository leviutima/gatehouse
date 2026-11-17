import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Field, Input } from '@leviutima/ds'
import { useForm } from 'react-hook-form'
import type { RoleScope } from '@/entities/role'
import { apiErrorCode, apiErrorMessage } from '@/shared/api'
import { useCreateRole } from '../api/use-create-role/use-create-role.ts'
import { createRoleSchema } from '../model/create-role-schema/create-role.schema.ts'
import type { CreateRoleValues } from '../model/create-role-schema/create-role.schema.ts'

interface CreateRoleFormProps {
  scope: RoleScope
}

export function CreateRoleForm({ scope }: CreateRoleFormProps) {
  const createRole = useCreateRole(scope)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateRoleValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: '', description: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createRole.mutateAsync(values)
      reset()
    } catch (error) {
      switch (apiErrorCode(error)) {
        case 'role_already_exists':
          setError('name', {
            message: `This ${scope.clientId === undefined ? 'realm' : 'client'} already has a role with this name.`,
          })
          break
        case 'invalid_role_name':
          setError('name', { message: apiErrorMessage(error) })
          break
        default:
          setError('root', {
            message: apiErrorMessage(error) ?? 'The role could not be created.',
          })
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
