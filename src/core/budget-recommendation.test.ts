import { describe, it, expect } from 'vitest'
import { buildBudgetRecommendation, manualCostEstimate } from './budget-recommendation'
import type { RecurringCostInput } from './budget-recommendation'
import type { DatedAmount } from './variable-cost-estimator'

const referenceDate = new Date('2026-07-15')

describe('manualCostEstimate', () => {
  it('returns the fixed amount tagged as manual-entry', () => {
    const result = manualCostEstimate(1500)
    expect(result.value).toBe(1500)
    expect(result.model).toBe('manual-entry')
  })
})

describe('buildBudgetRecommendation', () => {
  it('composes fixed and variable line items into a remaining-to-spend figure', () => {
    const recurringCosts: RecurringCostInput[] = [
      { id: 'rent', name: 'Bolig', categoryId: 'cat-housing', amount: 12000, isVariable: false },
      { id: 'power', name: 'Strøm', categoryId: 'cat-power', amount: null, isVariable: true },
    ]

    const transactionsByCategory = new Map<string, DatedAmount[]>([
      [
        'cat-power',
        [
          { amount: 1200, occurredOn: '2026-04-10' },
          { amount: 1800, occurredOn: '2026-05-10' },
          { amount: 1500, occurredOn: '2026-06-10' },
        ],
      ],
    ])

    const result = buildBudgetRecommendation(
      35000,
      recurringCosts,
      transactionsByCategory,
      3,
      referenceDate,
    )

    expect(result.income.value).toBe(35000)
    expect(result.income.model).toBe('logged-income')
    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems[0]!.estimate.model).toBe('manual-entry')
    expect(result.lineItems[1]!.estimate.model).toBe('variable-cost-rolling-average-v1')

    const expectedPower = (1200 + 1800 + 1500) / 3
    expect(result.totalCommitted.value).toBeCloseTo(12000 + expectedPower)
    const expectedRemaining = 35000 - (12000 + expectedPower)
    expect(result.remaining.value).toBeCloseTo(expectedRemaining)
    expect(result.split.fun.value).toBeCloseTo(expectedRemaining * 0.5)
    expect(result.split.savings.value).toBeCloseTo(expectedRemaining * 0.3)
    expect(result.split.unforeseen.value).toBeCloseTo(expectedRemaining * 0.2)
  })

  it('handles zero recurring costs', () => {
    const result = buildBudgetRecommendation(40000, [], new Map(), 3, referenceDate)

    expect(result.lineItems).toHaveLength(0)
    expect(result.totalCommitted.value).toBe(0)
    expect(result.remaining.value).toBe(40000)
  })

  it('falls back to the manual estimate for a variable cost with no history yet', () => {
    const recurringCosts: RecurringCostInput[] = [
      { id: 'power', name: 'Strøm', categoryId: 'cat-power', amount: 1400, isVariable: true },
    ]

    const result = buildBudgetRecommendation(40000, recurringCosts, new Map(), 3, referenceDate)

    expect(result.lineItems[0]!.estimate.value).toBe(1400)
    expect(result.lineItems[0]!.estimate.model).toBe('manual-fallback-no-history')
  })

  it('excludes a skipped recurring cost from totalCommitted/remaining but still lists it', () => {
    const recurringCosts: RecurringCostInput[] = [
      { id: 'rent', name: 'Bolig', categoryId: 'cat-housing', amount: 12000, isVariable: false },
      { id: 'netflix', name: 'Netflix', categoryId: 'cat-sub', amount: 199, isVariable: false },
    ]

    const result = buildBudgetRecommendation(
      40000,
      recurringCosts,
      new Map(),
      3,
      referenceDate,
      undefined,
      new Set(['netflix']),
    )

    expect(result.lineItems).toHaveLength(2)
    expect(result.lineItems.find((item) => item.recurringCostId === 'netflix')?.skipped).toBe(true)
    expect(result.lineItems.find((item) => item.recurringCostId === 'rent')?.skipped).toBe(false)
    expect(result.totalCommitted.value).toBe(12000)
    expect(result.remaining.value).toBe(28000)
  })

  it('applies the chosen budget model to the discretionary split', () => {
    const result = buildBudgetRecommendation(
      40000,
      [],
      new Map(),
      3,
      referenceDate,
      'relaxed-70-20-10',
    )

    expect(result.split.fun.value).toBeCloseTo(40000 * 0.7)
    expect(result.split.savings.value).toBeCloseTo(40000 * 0.2)
    expect(result.split.unforeseen.value).toBeCloseTo(40000 * 0.1)
  })

  it('clamps the discretionary split to zero when overspent', () => {
    const recurringCosts: RecurringCostInput[] = [
      { id: 'rent', name: 'Bolig', categoryId: 'cat-housing', amount: 50000, isVariable: false },
    ]

    const result = buildBudgetRecommendation(40000, recurringCosts, new Map(), 3, referenceDate)

    expect(result.remaining.value).toBe(-10000)
    expect(result.split.fun.value).toBe(0)
    expect(result.split.savings.value).toBe(0)
    expect(result.split.unforeseen.value).toBe(0)
  })
})
