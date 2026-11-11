import { describe, it, expect } from 'vitest'
import {
  getPayPeriod,
  getNextPayDate,
  getDaysUntilPayday,
  suggestEarlyPeriodStart,
} from './pay-schedule'

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

  describe('with an override start (payday fell on a weekend)', () => {
    // 15 Aug 2026 is a Saturday -- paid Friday 14 Aug instead.
    const payday = 15
    const overrideStart = new Date(2026, 7, 14)

    it('replaces the upcoming boundary and spans to the *next* regular payday', () => {
      const period = getPayPeriod(payday, new Date(2026, 7, 14), overrideStart)
      expect(period.start).toEqual(new Date(2026, 7, 14))
      expect(period.end).toEqual(new Date(2026, 8, 15))
    })

    it('keeps applying for the rest of that overridden period', () => {
      const period = getPayPeriod(payday, new Date(2026, 7, 30), overrideStart)
      expect(period.start).toEqual(new Date(2026, 7, 14))
      expect(period.end).toEqual(new Date(2026, 8, 15))
    })

    it('self-expires once the reference date reaches the next real payday, no cleanup needed', () => {
      const period = getPayPeriod(payday, new Date(2026, 8, 20), overrideStart)
      expect(period.start).toEqual(new Date(2026, 8, 15))
      expect(period.end).toEqual(new Date(2026, 9, 15))
    })

    it('is ignored before the override date is reached', () => {
      const period = getPayPeriod(payday, new Date(2026, 7, 10), overrideStart)
      expect(period.start).toEqual(new Date(2026, 6, 15))
      expect(period.end).toEqual(new Date(2026, 7, 15))
    })

    it('is a no-op when null', () => {
      const period = getPayPeriod(payday, new Date(2026, 7, 20), null)
      expect(period.start).toEqual(new Date(2026, 7, 15))
      expect(period.end).toEqual(new Date(2026, 8, 15))
    })
  })
})

describe('getNextPayDate', () => {
  it('returns the payday itself when it falls on a weekday', () => {
    // 15 July 2026 is a Wednesday.
    expect(getNextPayDate(15, new Date(2026, 6, 10))).toEqual(new Date(2026, 6, 15))
  })

  it('moves a Sunday payday to the Friday before', () => {
    // 15 Nov 2026 is a Sunday -- paid Friday 13 Nov.
    expect(getNextPayDate(15, new Date(2026, 10, 11, 14, 30))).toEqual(new Date(2026, 10, 13))
  })

  it('moves a Saturday payday to the Friday before', () => {
    // 15 Aug 2026 is a Saturday -- paid Friday 14 Aug.
    expect(getNextPayDate(15, new Date(2026, 7, 10))).toEqual(new Date(2026, 7, 14))
  })

  it("counts to the next cycle once the early Friday's pay has arrived", () => {
    // Friday 13 Nov: this cycle's pay is in, next is Tuesday 15 Dec.
    expect(getNextPayDate(15, new Date(2026, 10, 13, 9))).toEqual(new Date(2026, 11, 15))
  })

  it('counts to the next cycle on the weekend between the early Friday and the nominal payday', () => {
    expect(getNextPayDate(15, new Date(2026, 10, 14))).toEqual(new Date(2026, 11, 15))
  })

  it('can move a weekend payday on the 1st back into the previous month', () => {
    // 1 Aug 2026 is a Saturday -- paid Friday 31 Jul.
    expect(getNextPayDate(1, new Date(2026, 6, 29))).toEqual(new Date(2026, 6, 31))
    // Once that's arrived, the next one is Tuesday 1 Sep.
    expect(getNextPayDate(1, new Date(2026, 6, 31))).toEqual(new Date(2026, 8, 1))
  })

  it('respects an active early-period override', () => {
    const overrideStart = new Date(2026, 7, 14)
    expect(getNextPayDate(15, new Date(2026, 7, 14), overrideStart)).toEqual(new Date(2026, 8, 15))
  })
})

describe('getDaysUntilPayday', () => {
  it('counts down to the upcoming payday', () => {
    expect(getDaysUntilPayday(15, new Date(2026, 6, 10))).toBe(5)
  })

  it('counts to the following period when today is payday', () => {
    // 15 June -> next payday is Wednesday 15 July (30 days later)
    expect(getDaysUntilPayday(15, new Date(2026, 5, 15))).toBe(30)
  })

  it('counts today but not the (weekend-adjusted) pay date itself', () => {
    // Wednesday 11 Nov, payday 15 is a Sunday so pay arrives Friday 13:
    // 11 and 12 Nov are left to stretch the money across.
    expect(getDaysUntilPayday(15, new Date(2026, 10, 11, 14, 30))).toBe(2)
  })

  it('counts to the *next* regular payday once overridden, not "tomorrow"', () => {
    // Without the override this would be 1 (tomorrow, 15 Aug) -- with it,
    // today already starts the new period, so it counts to 15 Sep instead.
    const overrideStart = new Date(2026, 7, 14)
    expect(getDaysUntilPayday(15, new Date(2026, 7, 14), overrideStart)).toBe(32)
  })
})

describe('suggestEarlyPeriodStart', () => {
  it('suggests the preceding Friday when payday falls on a Saturday', () => {
    // 15 Aug 2026 is a Saturday.
    const suggestion = suggestEarlyPeriodStart(15, new Date(2026, 7, 14))
    expect(suggestion).toEqual(new Date(2026, 7, 14))
  })

  it('suggests the Friday two days early when payday falls on a Sunday', () => {
    // 15 Feb 2026 is a Sunday.
    const suggestion = suggestEarlyPeriodStart(15, new Date(2026, 1, 13))
    expect(suggestion).toEqual(new Date(2026, 1, 13))
  })

  it('returns null before the early date has arrived', () => {
    expect(suggestEarlyPeriodStart(15, new Date(2026, 7, 10))).toBeNull()
  })

  it('returns null once the real (weekend) payday itself has arrived', () => {
    expect(suggestEarlyPeriodStart(15, new Date(2026, 7, 15))).toBeNull()
  })

  it('returns null when payday does not fall on a weekend', () => {
    // 15 July 2026 is a Wednesday.
    expect(suggestEarlyPeriodStart(15, new Date(2026, 6, 10))).toBeNull()
  })
})
