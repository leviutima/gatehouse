import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button } from '@leviutima/ds'
import { useForm, useWatch } from 'react-hook-form'
import type { CreatedClient } from '@/entities/client'
import { apiErrorCode, apiErrorMessage } from '@/shared/api'
import { FormFooter } from '@/shared/ui'
import { useCreateClient } from '../api/use-save-client/use-save-client.ts'
import {
  clientFormSchema,
  emptyClientForm,
} from '../model/client-form-schema/client-form.schema.ts'
import type { ClientFormValues } from '../model/client-form-schema/client-form.schema.ts'
import { ClientFieldset } from './ClientFieldset.tsx'

interface CreateClientFormProps {
  realm: string
  onCreated(client: CreatedClient): void
}

export function CreateClientForm({ realm, onCreated }: CreateClientFormProps) {
  const createClient = useCreateClient(realm)
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyClientForm,
  })

  const type = useWatch({ control, name: 'type' })

  const onSubmit = handleSubmit(async (values) => {
    try {
      onCreated(await createClient.mutateAsync(values))
    } catch (error) {
      if (apiErrorCode(error) === 'client_already_exists') {
        setError('clientId', { message: 'This realm already has a client with this id.' })
        return
      }
      setError('root', {
        message: apiErrorMessage(error) ?? 'The client could not be created.',
      })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <ClientFieldset mode="create" register={register} errors={errors} type={type} />
      <FormFooter>
        {errors.root && <Alert tone="error">{errors.root.message}</Alert>}
        <div>
          <Button type="submit" loading={isSubmitting}>
            Create client
          </Button>
        </div>
      </FormFooter>
    </form>
  )
}
