import { describe, it, expect } from 'vitest'
import { getPayPeriod, getDaysUntilPayday } from './pay-schedule'

describe('getPayPeriod', () => {
  it("spans from this month's payday to next month's when reference date is after payday", () => {
    const period = getPayPeriod(15, new Date(2026, 6, 20)) // 20 July 2026
    expect(period.start).toEqual(new Date(2026, 6, 15))
    expect(period.end).toEqual(new Date(2026, 7, 15))
  })

  it("spans from last month's payday to this month's when reference date is before payday", () => {
    const period = getPayPeriod(15, new Date(2026, 6, 10)) // 10 July 2026
    expect(period.start).toEqual(new Date(2026, 5, 15))
    expect(period.end).toEqual(new Date(2026, 6, 15))
  })

  it('treats the payday itself as the start of a new period', () => {
    const period = getPayPeriod(15, new Date(2026, 6, 15))
    expect(period.start).toEqual(new Date(2026, 6, 15))
    expect(period.end).toEqual(new Date(2026, 7, 15))
  })

  it('clamps a payday of 31 to the last day of shorter months', () => {
    // 20 Feb 2026 is before this month's (clamped) 28th payday, so the
    // period is still the one that started on 31 Jan.
    const period = getPayPeriod(31, new Date(2026, 1, 20))
    expect(period.start).toEqual(new Date(2026, 0, 31))
    expect(period.end).toEqual(new Date(2026, 1, 28))
  })
})

describe('getDaysUntilPayday', () => {
  it('counts down to the upcoming payday', () => {
    expect(getDaysUntilPayday(15, new Date(2026, 6, 10))).toBe(5)
  })

  it('counts to the following period when today is payday', () => {
    // 15 July -> next payday is 15 August (31 days later)
    expect(getDaysUntilPayday(15, new Date(2026, 6, 15))).toBe(31)
  })
})
