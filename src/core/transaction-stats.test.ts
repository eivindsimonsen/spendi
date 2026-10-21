import { describe, it, expect } from 'vitest'
import { sumByCategory, type DatedCategoryAmount } from './transaction-stats'

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
