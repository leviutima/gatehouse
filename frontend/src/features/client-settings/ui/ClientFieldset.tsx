import { Checkbox, Field, Input, Radio, Switch, Textarea } from '@leviutima/ds'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { GrantType } from '@/entities/client'
import { SettingsSection } from '@/shared/ui'
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
    <>
      <SettingsSection
        title="Identity"
        description="How the client introduces itself in OAuth requests."
      >
        <div className="flex max-w-xl flex-col gap-4">
          <Field
            label="Client id"
            hint={mode === 'edit' ? 'Cannot change after creation.' : 'Sent as client_id. Cannot change later.'}
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
                {type === 'PUBLIC' ? 'Public' : 'Confidential'}. Cannot change after creation.
              </p>
            )}
          </fieldset>
        </div>
      </SettingsSection>

      <SettingsSection title="Grants" description="The ways this client is allowed to get tokens.">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Grants</legend>
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
      </SettingsSection>

      <SettingsSection
        title="URLs"
        description="Where Gatehouse may send users back, and which browser origins may call it. One per line."
      >
        <div className="flex max-w-xl flex-col gap-4">
          <Field label="Redirect URIs" hint="Required with the authorization code grant.">
            <Textarea {...register('redirectUris')} rows={3} className="font-mono text-sm" />
          </Field>
          <Field label="Post-logout redirect URIs">
            <Textarea {...register('postLogoutRedirectUris')} rows={2} className="font-mono text-sm" />
          </Field>
          <Field label="Web origins" hint="Allowed to call the token, userinfo and admin endpoints (CORS).">
            <Textarea {...register('webOrigins')} rows={2} className="font-mono text-sm" />
          </Field>
        </div>
      </SettingsSection>

      {mode === 'edit' && (
        <SettingsSection
          title="Status"
          description="A disabled client cannot get new tokens or refresh old ones."
        >
          <Switch {...register('enabled')} label="Enabled" />
        </SettingsSection>
      )}
    </>
  )
}
