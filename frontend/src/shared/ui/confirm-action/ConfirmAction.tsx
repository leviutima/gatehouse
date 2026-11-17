import { Button } from '@leviutima/ds'
import { useState } from 'react'

export interface ActionStatus {
  isPending: boolean
  isError: boolean
  reset(): void
}

interface ConfirmActionProps {
  label: string
  question: string
  failure: string
  status: ActionStatus
  onConfirm(): void
}

export function ConfirmAction({
  label,
  question,
  failure,
  status,
  onConfirm,
}: ConfirmActionProps) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        {label}
      </Button>
    )
  }
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-sm text-muted-foreground" role="status">
        {status.isError ? failure : question}
      </span>
      <Button
        variant="secondary"
        size="sm"
        loading={status.isPending}
        onClick={onConfirm}
      >
        Confirm
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={status.isPending}
        onClick={() => {
          status.reset()
          setConfirming(false)
        }}
      >
        Cancel
      </Button>
    </div>
  )
}
