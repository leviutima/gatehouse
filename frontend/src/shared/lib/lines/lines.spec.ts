import { describe, expect, it } from 'vitest'
import { fromLines, toLines } from './lines.ts'

describe('lines', () => {
  it('reads one trimmed item per line, skipping blank lines', () => {
    expect(toLines('  https://a.example/cb \n\n https://b.example \r\n')).toEqual([
      'https://a.example/cb',
      'https://b.example',
    ])
  })

  it('gives nothing for empty text', () => {
    expect(toLines('')).toEqual([])
  })

  it('writes one item per line', () => {
    expect(fromLines(['a', 'b'])).toBe('a\nb')
  })
})
