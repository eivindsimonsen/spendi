import { describe, it, expect } from 'vitest'
import { selectUnforeseenExpenses, type LoggedExpense } from './unforeseen-expenses'

const period = { start: new Date('2026-10-20'), end: new Date('2026-11-20') }

function expense(overrides: Partial<LoggedExpense>): LoggedExpense {
  return {
    id: 'tx',
    name: 'Tannlege',
    categoryId: 'cat-health',
    amount: 1000,
    occurredOn: '2026-10-22',
    ...overrides,
  }
}

describe('selectUnforeseenExpenses', () => {
  it('keeps expenses inside the period and drops those outside it', () => {
    const result = selectUnforeseenExpenses(
      [
        expense({ id: 'before', occurredOn: '2026-10-19' }),
        expense({ id: 'first-day', occurredOn: '2026-10-20' }),
        expense({ id: 'last-day', occurredOn: '2026-11-19' }),
        expense({ id: 'next-payday', occurredOn: '2026-11-20' }),
      ],
      period,
      new Set(),
    )

    expect(result.map((item) => item.id)).toEqual(['first-day', 'last-day'])
  })

  it("leaves out a variable cost's category, since its rolling average already counts it", () => {
    const result = selectUnforeseenExpenses(
      [
        expense({ id: 'power-bill', categoryId: 'cat-power' }),
        expense({ id: 'dentist', categoryId: 'cat-health' }),
      ],
      period,
      new Set(['cat-power']),
    )

    expect(result.map((item) => item.id)).toEqual(['dentist'])
  })

  it('lists the biggest expense first', () => {
    const result = selectUnforeseenExpenses(
      [
        expense({ id: 'small', amount: 84 }),
        expense({ id: 'big', amount: 10000 }),
        expense({ id: 'medium', amount: 502 }),
      ],
      period,
      new Set(),
    )

    expect(result.map((item) => item.id)).toEqual(['big', 'medium', 'small'])
  })

  it('hands back the same objects, extra fields and all', () => {
    const input = [{ ...expense({}), paidBy: 'profile-1' }]

    const result = selectUnforeseenExpenses(input, period, new Set())

    expect(result[0]).toBe(input[0])
    expect(result[0]?.paidBy).toBe('profile-1')
  })
})
