import { describe, it, expect } from 'vitest'
import {
  summarizeMonthlyIncomeExpense,
  calculateSavingsRate,
  type MonthlyIncomeExpense,
} from './income-expense-stats'
import type { DatedAmount } from './variable-cost-estimator'

describe('summarizeMonthlyIncomeExpense', () => {
  it('sums income and expenses per month and computes net', () => {
    const incomePayments: DatedAmount[] = [
      { amount: 30000, occurredOn: '2026-06-15' },
      { amount: 5000, occurredOn: '2026-06-20' },
    ]
    const expenseTransactions: DatedAmount[] = [{ amount: 12000, occurredOn: '2026-06-05' }]

    const result = summarizeMonthlyIncomeExpense(['2026-06'], incomePayments, expenseTransactions)

    expect(result).toEqual([{ month: '2026-06', income: 35000, expense: 12000, net: 23000 }])
  })

  it('zero-fills months with no activity instead of omitting them', () => {
    const result = summarizeMonthlyIncomeExpense(['2026-05', '2026-06'], [], [])

    expect(result).toEqual([
      { month: '2026-05', income: 0, expense: 0, net: 0 },
      { month: '2026-06', income: 0, expense: 0, net: 0 },
    ])
  })
})

describe('calculateSavingsRate', () => {
  it('computes the percentage of income left over after expenses', () => {
    const months: MonthlyIncomeExpense[] = [
      { month: '2026-05', income: 10000, expense: 8000, net: 2000 },
      { month: '2026-06', income: 10000, expense: 7000, net: 3000 },
    ]

    expect(calculateSavingsRate(months)).toBe(25)
  })

  it('returns a negative rate when expenses exceeded income', () => {
    const months: MonthlyIncomeExpense[] = [
      { month: '2026-06', income: 10000, expense: 12000, net: -2000 },
    ]

    expect(calculateSavingsRate(months)).toBe(-20)
  })

  it('returns null instead of dividing by zero when no income was logged', () => {
    const months: MonthlyIncomeExpense[] = [{ month: '2026-06', income: 0, expense: 500, net: -500 }]

    expect(calculateSavingsRate(months)).toBeNull()
  })
})
