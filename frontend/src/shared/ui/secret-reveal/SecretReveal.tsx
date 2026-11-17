import { Alert } from '@leviutima/ds'
import { CopyButton } from '../copy-button/CopyButton.tsx'

interface SecretRevealProps {
  secret: string
}

export function SecretReveal({ secret }: SecretRevealProps) {
  return (
    <Alert title="Copy the secret now">
      <p className="mb-3">
        Gatehouse keeps only its hash, so it cannot show this secret again.
      </p>
      <div className="flex items-center gap-1">
        <code className="rounded border border-border bg-background px-2 py-1 font-mono text-sm break-all">
          {secret}
        </code>
        <CopyButton value={secret} label="Copy the secret" />
      </div>
    </Alert>
  )
}
