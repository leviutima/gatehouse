import { buttonVariants } from '@leviutima/ds'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { CreatedClient } from '@/entities/client'
import { CreateClientForm } from '@/features/client-settings'
import { SecretReveal } from '@/shared/ui'

interface NewClientPageProps {
  realm: string
}

export function NewClientPage({ realm }: NewClientPageProps) {
  const [created, setCreated] = useState<CreatedClient | null>(null)

  if (created) {
    return (
      <section className="flex flex-col items-start gap-4">
        <h2 className="text-lg font-semibold">
          Client <span className="font-mono">{created.clientId}</span> created
        </h2>
        {created.secret ? (
          <SecretReveal secret={created.secret} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Public clients have no secret. They prove who they are with PKCE.
          </p>
        )}
        <Link
          to="/realms/$realm/clients/$clientId"
          params={{ realm, clientId: created.clientId }}
          className={buttonVariants({ variant: 'secondary' })}
        >
          Open the client
        </Link>
      </section>
    )
  }
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">New client</h2>
      <CreateClientForm realm={realm} onCreated={setCreated} />
    </section>
  )
}
