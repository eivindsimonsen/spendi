import { describe, it, expect } from 'vitest'
import { estimateVariableCost, type DatedAmount } from './variable-cost-estimator'

// Mid-July: a 3-month lookback window covers [Apr 1, Jul 1).
const referenceDate = new Date('2026-07-15')

describe('estimateVariableCost', () => {
  it('averages full history across the lookback window', () => {
    const transactions: DatedAmount[] = [
      { amount: 1200, occurredOn: '2026-04-10' },
      { amount: 980, occurredOn: '2026-05-12' },
      { amount: 1450, occurredOn: '2026-06-20' },
    ]

    const result = estimateVariableCost(transactions, 3, referenceDate)

    expect(result.value).toBeCloseTo((1200 + 980 + 1450) / 3)
    expect(result.steps[0]!.inputs).toHaveLength(3)
  })

  it('averages over fewer months when history is shorter than the lookback', () => {
    const transactions: DatedAmount[] = [
      { amount: 1000, occurredOn: '2026-05-05' },
      { amount: 1200, occurredOn: '2026-06-05' },
    ]

    const result = estimateVariableCost(transactions, 3, referenceDate)

    expect(result.value).toBeCloseTo((1000 + 1200) / 2)
  })

  it('returns zero with an explanatory step when there is no history', () => {
    const result = estimateVariableCost([], 3, referenceDate)

    expect(result.value).toBe(0)
    expect(result.summary).toMatch(/ingen tidligere/i)
  })

  it('sums multiple transactions within the same month', () => {
    const transactions: DatedAmount[] = [
      { amount: 500, occurredOn: '2026-06-01' },
      { amount: 700, occurredOn: '2026-06-28' },
    ]

    const result = estimateVariableCost(transactions, 3, referenceDate)

    expect(result.value).toBe(1200)
  })

  it('includes a transaction exactly at the window start', () => {
    const transactions: DatedAmount[] = [{ amount: 500, occurredOn: '2026-04-01' }]

    const result = estimateVariableCost(transactions, 3, referenceDate)

    expect(result.value).toBe(500)
  })

  it('excludes transactions from the current, in-progress month', () => {
    const transactions: DatedAmount[] = [
      { amount: 1000, occurredOn: '2026-06-15' },
      { amount: 9999, occurredOn: '2026-07-01' },
    ]

    const result = estimateVariableCost(transactions, 3, referenceDate)

    expect(result.value).toBe(1000)
  })

  it('excludes transactions older than the lookback window', () => {
    const transactions: DatedAmount[] = [
      { amount: 1000, occurredOn: '2026-06-15' },
      { amount: 9999, occurredOn: '2026-01-01' },
    ]

    const result = estimateVariableCost(transactions, 3, referenceDate)

    expect(result.value).toBe(1000)
  })
})
