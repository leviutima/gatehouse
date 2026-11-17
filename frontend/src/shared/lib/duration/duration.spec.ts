import { describe, expect, it } from 'vitest'
import { formatDuration } from './duration.ts'

describe('formatDuration', () => {
  it.each([
    [300, '5 min'],
    [1_800, '30 min'],
    [36_000, '10 h'],
    [90, '1 min 30 s'],
    [90_061, '1 d 1 h 1 min 1 s'],
  ])('writes %i seconds as %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })

  it.each([0, -5, Number.NaN])('writes nothing for %d', (seconds) => {
    expect(formatDuration(seconds)).toBe('')
  })
})
