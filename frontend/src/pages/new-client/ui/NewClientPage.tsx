import { buttonVariants } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { CreatedClient } from '@/entities/client'
import { CreateClientForm } from '@/features/client-settings'
import { PageHeader, SecretReveal } from '@/shared/ui'

interface NewClientPageProps {
  realm: string
}

export function NewClientPage({ realm }: NewClientPageProps) {
  const [created, setCreated] = useState<CreatedClient | null>(null)

  if (created) {
    return (
      <>
        <PageHeader
          title={
            <>
              Client <span className="font-mono">{created.clientId}</span> created
            </>
          }
          actions={
            <Link
              to="/realms/$realm/clients/$clientId"
              params={{ realm, clientId: created.clientId }}
              className={buttonVariants({ size: 'sm' })}
            >
              Open the client
            </Link>
          }
        />
        <div className="max-w-2xl">
          {created.secret ? (
            <SecretReveal secret={created.secret} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Public clients have no secret. They prove who they are with PKCE.
            </p>
          )}
        </div>
      </>
    )
  }
  return (
    <>
      <PageHeader title="New client" />
      <CreateClientForm realm={realm} onCreated={setCreated} />
    </>
  )
}
