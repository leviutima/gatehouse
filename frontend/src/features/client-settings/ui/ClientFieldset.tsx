import { Checkbox, Field, Input, Radio, Switch, Textarea } from '@leviutima/ds'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { GrantType } from '@/entities/client'
import type { ClientFormValues } from '../model/client-form-schema/client-form.schema.ts'

interface ClientFieldsetProps {
  mode: 'create' | 'edit'
  register: UseFormRegister<ClientFormValues>
  errors: FieldErrors<ClientFormValues>
  type: ClientFormValues['type']
}

const grants: { value: GrantType; label: string; hint: string }[] = [
  {
    value: 'AUTHORIZATION_CODE',
    label: 'Authorization code',
    hint: 'Users sign in through the Gatehouse login page.',
  },
  {
    value: 'REFRESH_TOKEN',
    label: 'Refresh token',
    hint: 'Renews user tokens without a new sign-in.',
  },
  {
    value: 'CLIENT_CREDENTIALS',
    label: 'Client credentials',
    hint: 'A service calls APIs as itself, without a user.',
  },
]

export function ClientFieldset({
  mode,
  register,
  errors,
  type,
}: ClientFieldsetProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Client id"
          hint={mode === 'edit' ? 'Cannot change after creation.' : 'Used as client_id in OAuth requests.'}
          error={errors.clientId?.message}
          required
        >
          <Input
            {...register('clientId')}
            readOnly={mode === 'edit'}
            autoComplete="off"
            placeholder="billing"
            className="font-mono"
          />
        </Field>
        <Field label="Name" error={errors.name?.message} required>
          <Input {...register('name')} autoComplete="off" placeholder="Billing service" />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Type</legend>
        {mode === 'create' ? (
          <>
            <Radio
              {...register('type')}
              value="CONFIDENTIAL"
              label="Confidential: runs on a server and keeps a secret"
            />
            <Radio
              {...register('type')}
              value="PUBLIC"
              label="Public: runs in a browser or an app and cannot keep a secret"
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {type === 'PUBLIC' ? 'Public' : 'Confidential'} (cannot change after creation)
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Grants</legend>
        {grants.map((grant) => (
          <div key={grant.value}>
            <Checkbox {...register('grantTypes')} value={grant.value} label={grant.label} />
            <p className="ml-6 text-xs text-muted-foreground">{grant.hint}</p>
          </div>
        ))}
        {errors.grantTypes && (
          <p className="text-xs text-foreground" role="alert">
            {errors.grantTypes.message}
          </p>
        )}
      </fieldset>

      <Field label="Redirect URIs" hint="One per line. Required with the authorization code grant.">
        <Textarea {...register('redirectUris')} rows={3} className="font-mono text-sm" />
      </Field>
      <Field label="Post-logout redirect URIs" hint="One per line.">
        <Textarea {...register('postLogoutRedirectUris')} rows={2} className="font-mono text-sm" />
      </Field>
      <Field label="Web origins" hint="One per line. Browser origins allowed to call Gatehouse (CORS).">
        <Textarea {...register('webOrigins')} rows={2} className="font-mono text-sm" />
      </Field>

      {mode === 'edit' && <Switch {...register('enabled')} label="Enabled" />}
    </div>
  )
}
