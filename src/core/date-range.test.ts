import { describe, it, expect } from 'vitest'
import { isWithinRange } from './date-range'

describe('isWithinRange', () => {
  const start = new Date(2026, 5, 15)
  const end = new Date(2026, 6, 15)

  it('is true for a date strictly between start and end', () => {
    expect(isWithinRange(new Date(2026, 6, 1), start, end)).toBe(true)
  })

  it('includes the start boundary', () => {
    expect(isWithinRange(start, start, end)).toBe(true)
  })

  it('excludes the end boundary', () => {
    expect(isWithinRange(end, start, end)).toBe(false)
  })

  it('excludes a date before start', () => {
    expect(isWithinRange(new Date(2026, 5, 14), start, end)).toBe(false)
  })

  it('excludes a date after end', () => {
    expect(isWithinRange(new Date(2026, 6, 16), start, end)).toBe(false)
  })
})
