import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Checkbox, Field, Input, Select } from '@leviutima/ds'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { createRealm, realmsQueryKey } from '@/entities/realm'
import type { Realm } from '@/entities/realm'
import { apiErrorCode, apiErrorMessage } from '@/shared/api'
import { FormFooter, SettingsSection } from '@/shared/ui'
import {
  createRealmSchema,
  emptyRealmForm,
  toNewRealm,
} from '../model/create-realm-schema/create-realm.schema.ts'
import type { CreateRealmValues } from '../model/create-realm-schema/create-realm.schema.ts'

interface CreateRealmFormProps {
  onCreated(realm: Realm): void
}

export function CreateRealmForm({ onCreated }: CreateRealmFormProps) {
  const queryClient = useQueryClient()
  const create = useMutation({
    mutationFn: (values: CreateRealmValues) => createRealm(toNewRealm(values)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: realmsQueryKey, exact: true }),
  })
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateRealmValues>({
    resolver: zodResolver(createRealmSchema),
    defaultValues: emptyRealmForm,
  })
  const [withAdmin, loginIdentifier] = useWatch({
    control,
    name: ['withAdmin', 'loginIdentifier'],
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      onCreated(await create.mutateAsync(values))
    } catch (error) {
      const message = apiErrorMessage(error)
      switch (apiErrorCode(error)) {
        case 'realm_already_exists':
          setError('name', { message: 'There is already a realm with this name.' })
          break
        case 'weak_password':
          setError('adminPassword', { message })
          break
        default:
          setError('root', { message: message ?? 'The realm could not be created.' })
      }
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <SettingsSection title="Realm" description="The name goes in every URL of the realm, including its issuer.">
        <div className="flex max-w-xl flex-col gap-4">
          <Field
            label="Name"
            hint="Lowercase letters, digits and hyphens. Cannot change later."
            error={errors.name?.message}
            required
          >
            <Input {...register('name')} autoComplete="off" placeholder="shop" className="font-mono" />
          </Field>
          <Field label="Display name" error={errors.displayName?.message} required>
            <Input {...register('displayName')} autoComplete="off" placeholder="Shop" />
          </Field>
          <Field label="Users sign in with" hint="Cannot change later.">
            <Select {...register('loginIdentifier')}>
              <option value="USERNAME_OR_EMAIL">Username or email</option>
              <option value="USERNAME">Username</option>
              <option value="EMAIL">Email</option>
            </Select>
          </Field>
        </div>
      </SettingsSection>
      <SettingsSection title="First admin" description="Someone who can manage this realm without an admin of master. You can add one later too.">
        <div className="flex max-w-xl flex-col gap-4">
          <Checkbox {...register('withAdmin')} label="Create the first admin of the realm" />
          {withAdmin && (
            <>
              {loginIdentifier !== 'EMAIL' && (
                <Field label="Admin username" error={errors.adminUsername?.message} required>
                  <Input {...register('adminUsername')} autoComplete="off" />
                </Field>
              )}
              <Field label="Admin email" error={errors.adminEmail?.message} required>
                <Input {...register('adminEmail')} type="email" autoComplete="off" />
              </Field>
              <Field label="Admin password" error={errors.adminPassword?.message} required>
                <Input {...register('adminPassword')} type="password" autoComplete="new-password" />
              </Field>
            </>
          )}
        </div>
      </SettingsSection>
      <FormFooter>
        {errors.root && <Alert tone="error">{errors.root.message}</Alert>}
        <div>
          <Button type="submit" loading={isSubmitting}>
            Create realm
          </Button>
        </div>
      </FormFooter>
    </form>
  )
}
