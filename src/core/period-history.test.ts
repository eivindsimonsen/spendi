import { describe, it, expect } from 'vitest'
import { getPastPeriods, summarizePeriod } from './period-history'
import type { DatedAmount } from './variable-cost-estimator'

describe('getPastPeriods', () => {
  it('walks backward producing the requested number of prior periods, most recent first', () => {
    // Payday the 15th, "now" is 20 July 2026 -> current period is
    // [07-15, 08-15). The prior period should be [06-15, 07-15), then
    // [05-15, 06-15).
    const periods = getPastPeriods(15, new Date(2026, 6, 20), 2)

    expect(periods).toHaveLength(2)
    expect(periods[0]!.start).toEqual(new Date(2026, 5, 15))
    expect(periods[0]!.end).toEqual(new Date(2026, 6, 15))
    expect(periods[1]!.start).toEqual(new Date(2026, 4, 15))
    expect(periods[1]!.end).toEqual(new Date(2026, 5, 15))
  })

  it('returns an empty array when count is 0', () => {
    expect(getPastPeriods(15, new Date(2026, 6, 20), 0)).toEqual([])
  })
})

describe('summarizePeriod', () => {
  const period = { start: new Date('2026-06-15'), end: new Date('2026-07-15') }

  it('sums only the items that fall within the period', () => {
    const incomePayments: DatedAmount[] = [
      { amount: 30000, occurredOn: '2026-06-15' },
      { amount: 5000, occurredOn: '2026-07-14' },
      { amount: 9999, occurredOn: '2026-07-15' }, // excluded: period end is exclusive
      { amount: 9999, occurredOn: '2026-06-14' }, // excluded: before period start
    ]
    const transactions: DatedAmount[] = [{ amount: 12000, occurredOn: '2026-06-20' }]
    const savingsContributions: DatedAmount[] = [{ amount: 2000, occurredOn: '2026-07-01' }]

    const result = summarizePeriod(period, incomePayments, transactions, savingsContributions)

    expect(result.income).toBe(35000)
    expect(result.spent).toBe(12000)
    expect(result.saved).toBe(2000)
    expect(result.period).toBe(period)
  })

  it('returns all zeros when nothing falls in range', () => {
    const result = summarizePeriod(period, [], [], [])
    expect(result).toEqual({ period, income: 0, spent: 0, saved: 0 })
  })
})
