import { useMutation } from '@tanstack/react-query'
import { rotateClientSecret } from '@/entities/client'
import { ConfirmAction, SecretReveal } from '@/shared/ui'

interface RotateClientSecretProps {
  realm: string
  clientId: string
}

export function RotateClientSecret({ realm, clientId }: RotateClientSecretProps) {
  const rotate = useMutation({
    mutationFn: () => rotateClientSecret(realm, clientId),
  })

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">
        A new secret replaces the current one at once. Services still using the
        old secret stop getting tokens.
      </p>
      {rotate.data ? (
        <SecretReveal secret={rotate.data} />
      ) : (
        <ConfirmAction
          label="Generate a new secret"
          question="Replace the current secret?"
          failure="Could not generate a secret."
          status={rotate}
          onConfirm={() => rotate.mutate()}
        />
      )}
    </div>
  )
}
