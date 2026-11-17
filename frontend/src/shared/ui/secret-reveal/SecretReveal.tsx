import { Alert, Button } from '@leviutima/ds'
import { useState } from 'react'

interface SecretRevealProps {
  secret: string
}

export function SecretReveal({ secret }: SecretRevealProps) {
  const [copied, setCopied] = useState(false)

  return (
    <Alert title="Copy the secret now">
      <p className="mb-3">
        Gatehouse keeps only its hash, so it cannot show this secret again.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded border border-border bg-background px-2 py-1 font-mono text-sm break-all">
          {secret}
        </code>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            void navigator.clipboard.writeText(secret).then(() => setCopied(true))
          }
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </Alert>
  )
}
