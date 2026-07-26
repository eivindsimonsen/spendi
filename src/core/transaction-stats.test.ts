import { describe, it, expect } from 'vitest'
import {
  sumByCategory,
  sumByMonth,
  topCategories,
  monthOverMonthChange,
  type DatedCategoryAmount,
  type MonthTotal,
} from './transaction-stats'

describe('sumByCategory', () => {
  it('sums amounts per category and sorts descending by total', () => {
    const transactions: DatedCategoryAmount[] = [
      { categoryId: 'groceries', amount: 500, occurredOn: '2026-06-01' },
      { categoryId: 'power', amount: 1200, occurredOn: '2026-06-05' },
      { categoryId: 'groceries', amount: 300, occurredOn: '2026-06-10' },
    ]

    const result = sumByCategory(transactions)

    expect(result).toEqual([
      { categoryId: 'power', total: 1200 },
      { categoryId: 'groceries', total: 800 },
    ])
  })

  it('returns an empty array for no transactions', () => {
    expect(sumByCategory([])).toEqual([])
  })
})

describe('sumByMonth', () => {
  it('sums amounts per month and sorts chronologically', () => {
    const transactions: DatedCategoryAmount[] = [
      { categoryId: 'groceries', amount: 500, occurredOn: '2026-06-01' },
      { categoryId: 'power', amount: 1200, occurredOn: '2026-05-05' },
      { categoryId: 'groceries', amount: 300, occurredOn: '2026-06-10' },
    ]

    const result = sumByMonth(transactions)

    expect(result).toEqual([
      { month: '2026-05', total: 1200 },
      { month: '2026-06', total: 800 },
    ])
  })
})

describe('topCategories', () => {
  it('ranks categories by spend and attaches each share of the grand total', () => {
    const transactions: DatedCategoryAmount[] = [
      { categoryId: 'groceries', amount: 750, occurredOn: '2026-06-01' },
      { categoryId: 'power', amount: 250, occurredOn: '2026-06-05' },
    ]

    const result = topCategories(transactions, 5)

    expect(result).toEqual([
      { categoryId: 'groceries', total: 750, percentage: 75 },
      { categoryId: 'power', total: 250, percentage: 25 },
    ])
  })

  it('limits the result to the requested count', () => {
    const transactions: DatedCategoryAmount[] = [
      { categoryId: 'a', amount: 300, occurredOn: '2026-06-01' },
      { categoryId: 'b', amount: 200, occurredOn: '2026-06-01' },
      { categoryId: 'c', amount: 100, occurredOn: '2026-06-01' },
    ]

    expect(topCategories(transactions, 2)).toHaveLength(2)
  })

  it('returns 0% shares instead of dividing by zero when there are no transactions', () => {
    expect(topCategories([], 5)).toEqual([])
  })
})

describe('monthOverMonthChange', () => {
  it('computes a positive change percentage when spend increased', () => {
    const months: MonthTotal[] = [
      { month: '2026-05', total: 1000 },
      { month: '2026-06', total: 1200 },
    ]

    expect(monthOverMonthChange(months)).toEqual({
      previousTotal: 1000,
      currentTotal: 1200,
      changePercentage: 20,
    })
  })

  it('computes a negative change percentage when spend decreased', () => {
    const months: MonthTotal[] = [
      { month: '2026-05', total: 1000 },
      { month: '2026-06', total: 800 },
    ]

    expect(monthOverMonthChange(months).changePercentage).toBe(-20)
  })

  it('returns null instead of dividing by zero when the previous month had no spend', () => {
    const months: MonthTotal[] = [
      { month: '2026-05', total: 0 },
      { month: '2026-06', total: 500 },
    ]

    expect(monthOverMonthChange(months).changePercentage).toBeNull()
  })

  it('treats a single-month list as having no previous month', () => {
    const months: MonthTotal[] = [{ month: '2026-06', total: 500 }]

    expect(monthOverMonthChange(months)).toEqual({
      previousTotal: 0,
      currentTotal: 500,
      changePercentage: null,
    })
  })

  it('handles an empty list', () => {
    expect(monthOverMonthChange([])).toEqual({
      previousTotal: 0,
      currentTotal: 0,
      changePercentage: null,
    })
  })
})
