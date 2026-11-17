const units = [
  { seconds: 86_400, label: 'd' },
  { seconds: 3_600, label: 'h' },
  { seconds: 60, label: 'min' },
  { seconds: 1, label: 's' },
] as const

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return ''
  }
  const parts: string[] = []
  let rest = Math.floor(totalSeconds)
  for (const unit of units) {
    const amount = Math.floor(rest / unit.seconds)
    if (amount > 0) {
      parts.push(`${amount} ${unit.label}`)
      rest -= amount * unit.seconds
    }
  }
  return parts.join(' ')
}
