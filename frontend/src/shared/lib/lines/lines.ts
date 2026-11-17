export function toLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function fromLines(lines: readonly string[]): string {
  return lines.join('\n')
}
