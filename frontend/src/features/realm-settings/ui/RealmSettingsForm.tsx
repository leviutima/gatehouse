import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Field, Input, Switch } from '@leviutima/ds'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { realmQueryKey, realmsQueryKey, updateRealm } from '@/entities/realm'
import type { Realm, RealmSettings } from '@/entities/realm'
import { apiErrorCode, apiErrorMessage } from '@/shared/api'
import { formatDuration } from '@/shared/lib/duration'

const wholeNumber = z.number({ error: 'Enter a whole number.' }).int('Enter a whole number.')

const realmSettingsSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter a display name.'),
  enabled: z.boolean(),
  passwordMinLength: wholeNumber,
  accessTokenLifespan: wholeNumber,
  sessionIdleTimeout: wholeNumber,
  sessionMaxLifespan: wholeNumber,
})

function settingsOf(realm: Realm): RealmSettings {
  return {
    displayName: realm.displayName,
    enabled: realm.enabled,
    passwordMinLength: realm.passwordMinLength,
    accessTokenLifespan: realm.accessTokenLifespan,
    sessionIdleTimeout: realm.sessionIdleTimeout,
    sessionMaxLifespan: realm.sessionMaxLifespan,
  }
}

const durations = [
  {
    name: 'accessTokenLifespan',
    label: 'Access token lifespan',
    hint: 'How long an access token stays valid. Short keeps removed roles from lingering.',
  },
  {
    name: 'sessionIdleTimeout',
    label: 'Session idle timeout',
    hint: 'A sign-in session ends after this long without use.',
  },
  {
    name: 'sessionMaxLifespan',
    label: 'Session max lifespan',
    hint: 'A sign-in session ends after this long, used or not.',
  },
] as const

interface RealmSettingsFormProps {
  realm: Realm
}

export function RealmSettingsForm({ realm }: RealmSettingsFormProps) {
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: (settings: RealmSettings) => updateRealm(realm.name, settings),
    onSuccess: (saved) => {
      queryClient.setQueryData(realmQueryKey(realm.name), saved)
      return queryClient.invalidateQueries({ queryKey: realmsQueryKey, exact: true })
    },
  })
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty, isSubmitSuccessful },
  } = useForm<RealmSettings>({
    resolver: zodResolver(realmSettingsSchema),
    defaultValues: settingsOf(realm),
  })

  const lifespans = useWatch({
    control,
    name: ['accessTokenLifespan', 'sessionIdleTimeout', 'sessionMaxLifespan'],
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      reset(settingsOf(await save.mutateAsync(values)))
    } catch (error) {
      setError('root', {
        message:
          apiErrorCode(error) === 'realm_status_requires_global_admin'
            ? 'Only an admin of the master realm can enable or disable a realm.'
            : (apiErrorMessage(error) ?? 'The settings could not be saved.'),
      })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-lg flex-col gap-4">
      <Field label="Display name" error={errors.displayName?.message} required>
        <Input {...register('displayName')} autoComplete="off" />
      </Field>
      <Field
        label="Minimum password length"
        hint="Applies to new passwords. Never below 8."
        error={errors.passwordMinLength?.message}
      >
        <Input {...register('passwordMinLength', { valueAsNumber: true })} type="number" className="max-w-32" />
      </Field>
      {durations.map((duration, index) => (
        <Field
          key={duration.name}
          label={`${duration.label} (seconds)`}
          hint={[formatDuration(lifespans[index]), duration.hint].filter(Boolean).join(' · ')}
          error={errors[duration.name]?.message}
        >
          <Input {...register(duration.name, { valueAsNumber: true })} type="number" className="max-w-32" />
        </Field>
      ))}
      <Switch {...register('enabled')} label="Enabled" />
      <p className="-mt-2 text-xs text-muted-foreground">
        A disabled realm rejects sign-ins and its tokens stop working.
      </p>
      {errors.root && <Alert tone="error">{errors.root.message}</Alert>}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
        {isSubmitSuccessful && !isDirty && (
          <span className="text-sm text-muted-foreground" role="status">
            Saved.
          </span>
        )}
      </div>
    </form>
  )
}
