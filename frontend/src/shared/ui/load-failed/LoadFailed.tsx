import { Alert, Button } from '@leviutima/ds'

interface LoadFailedProps {
  what: string
  onRetry(): void
}

export function LoadFailed({ what, onRetry }: LoadFailedProps) {
  return (
    <div className="flex flex-col items-start gap-4">
      <Alert tone="error" className="w-full">
        The {what} could not be loaded.
      </Alert>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
