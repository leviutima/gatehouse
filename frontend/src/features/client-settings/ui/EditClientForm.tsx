import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button } from '@leviutima/ds'
import { useForm } from 'react-hook-form'
import type { Client } from '@/entities/client'
import { apiErrorMessage } from '@/shared/api'
import { FormFooter } from '@/shared/ui'
import { useUpdateClient } from '../api/use-save-client/use-save-client.ts'
import {
  clientFormSchema,
  clientFormValues,
} from '../model/client-form-schema/client-form.schema.ts'
import type { ClientFormValues } from '../model/client-form-schema/client-form.schema.ts'
import { ClientFieldset } from './ClientFieldset.tsx'

interface EditClientFormProps {
  realm: string
  client: Client
}

export function EditClientForm({ realm, client }: EditClientFormProps) {
  const updateClient = useUpdateClient(realm, client.clientId)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty, isSubmitSuccessful },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: clientFormValues(client),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      reset(clientFormValues(await updateClient.mutateAsync(values)))
    } catch (error) {
      setError('root', {
        message: apiErrorMessage(error) ?? 'The client could not be saved.',
      })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <ClientFieldset mode="edit" register={register} errors={errors} type={client.type} />
      <FormFooter>
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
      </FormFooter>
    </form>
  )
}
