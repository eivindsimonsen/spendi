import { describe, it, expect } from 'vitest'
import { calculateSavingsStreak } from './savings-streak'

// Payday on the 20th, so the current period runs 20 Oct – 19 Nov. Dates
// sit mid-period to stay clear of any timezone edge at the boundaries.
const PAYDAY = 20
const today = new Date(2026, 9, 25)

describe('calculateSavingsStreak', () => {
  it('counts consecutive periods with saving, including the current one', () => {
    const result = calculateSavingsStreak(PAYDAY, today, ['2026-10-22', '2026-09-28', '2026-08-25'])

    expect(result.current.value).toBe(3)
    expect(result.current.unit).toBe('perioder')
    expect(result.longest).toBe(3)
  })

  it("doesn't break the streak while the current period is still open", () => {
    const result = calculateSavingsStreak(PAYDAY, today, ['2026-09-28', '2026-08-25'])

    expect(result.current.value).toBe(2)
    expect(result.current.summary).toContain('mangler fortsatt')
  })

  it('restarts after a period without saving', () => {
    const result = calculateSavingsStreak(PAYDAY, today, ['2026-10-22', '2026-08-25', '2026-07-25'])

    expect(result.current.value).toBe(1)
    expect(result.current.unit).toBe('periode')
    expect(result.longest).toBe(2)
  })

  it('counts several contributions in one period once', () => {
    const result = calculateSavingsStreak(PAYDAY, today, ['2026-10-22', '2026-10-30', '2026-11-05'])

    expect(result.current.value).toBe(1)
  })

  it('remembers the longest run after the current one has ended', () => {
    const result = calculateSavingsStreak(PAYDAY, today, [
      '2026-07-25',
      '2026-06-25',
      '2026-05-25',
      '2026-04-25',
    ])

    expect(result.current.value).toBe(0)
    expect(result.longest).toBe(4)
  })

  it('is zero with nothing saved yet', () => {
    const result = calculateSavingsStreak(PAYDAY, today, [])

    expect(result.current.value).toBe(0)
    expect(result.longest).toBe(0)
    expect(result.current.summary).toContain('Ingen sparing')
  })

  it('lists the streak periods and the one that ended it in the explanation', () => {
    const result = calculateSavingsStreak(PAYDAY, today, ['2026-10-22', '2026-08-25'])

    const values = result.current.steps[0]?.inputs.map((input) => input.value)
    expect(values).toEqual(['spart ✓', 'ingen sparing'])
  })
})
