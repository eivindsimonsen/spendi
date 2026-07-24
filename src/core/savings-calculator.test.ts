import { describe, it, expect } from 'vitest'
import { calculateRequiredMonthlySavings } from './savings-calculator'

const referenceDate = new Date(2026, 6, 15) // 15 July 2026

describe('calculateRequiredMonthlySavings', () => {
  it('divides the remaining amount evenly across the months left', () => {
    const result = calculateRequiredMonthlySavings(
      { targetAmount: 12000, currentAmount: 2000, targetDate: new Date(2026, 11, 15) }, // 5 months out
      referenceDate,
    )

    expect(result.value).toBe(2000)
    expect(result.model).toBe('savings-goal-linear-v1')
  })

  it('returns zero when the goal is already met', () => {
    const result = calculateRequiredMonthlySavings(
      { targetAmount: 10000, currentAmount: 10000, targetDate: new Date(2026, 11, 15) },
      referenceDate,
    )

    expect(result.value).toBe(0)
    expect(result.model).toBe('savings-goal-met')
  })

  it('returns zero when more has been saved than the target', () => {
    const result = calculateRequiredMonthlySavings(
      { targetAmount: 10000, currentAmount: 15000, targetDate: new Date(2026, 11, 15) },
      referenceDate,
    )

    expect(result.value).toBe(0)
  })

  it('requires the full remaining amount when the target date has passed', () => {
    const result = calculateRequiredMonthlySavings(
      { targetAmount: 10000, currentAmount: 4000, targetDate: new Date(2026, 0, 1) },
      referenceDate,
    )

    expect(result.value).toBe(6000)
    expect(result.model).toBe('savings-goal-due-soon')
  })

  it('requires the full remaining amount when the target date is within the current month', () => {
    const result = calculateRequiredMonthlySavings(
      { targetAmount: 10000, currentAmount: 4000, targetDate: new Date(2026, 6, 28) },
      referenceDate,
    )

    expect(result.value).toBe(6000)
    expect(result.model).toBe('savings-goal-due-soon')
  })

  it('floors partial months so the estimate errs high rather than low', () => {
    // ~1.5 months out -> floored to 1 month, so the full remaining amount
    // is recommended for that one month rather than splitting it in half.
    const result = calculateRequiredMonthlySavings(
      { targetAmount: 3000, currentAmount: 0, targetDate: new Date(2026, 7, 30) },
      referenceDate,
    )

    expect(result.value).toBe(3000)
  })
})
