import { describe, it, expect } from 'vitest'
import { formatCurrencyNOK, todayLocalDate, formatShortDate, formatMonthName } from './format'

describe('formatCurrencyNOK', () => {
  it('formats a whole number of kroner with no decimals', () => {
    expect(formatCurrencyNOK(1500)).toContain('500')
    expect(formatCurrencyNOK(1500)).not.toContain(',')
  })
})

describe('todayLocalDate', () => {
  it('returns a yyyy-MM-dd formatted string', () => {
    expect(todayLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatShortDate', () => {
  it('includes the day number and month', () => {
    const result = formatShortDate(new Date(2026, 6, 15))
    expect(result).toContain('15')
    expect(result.toLowerCase()).toContain('jul')
  })
})

describe('formatMonthName', () => {
  it('returns the full Norwegian month name', () => {
    expect(formatMonthName(new Date(2026, 5, 12)).toLowerCase()).toBe('juni')
    expect(formatMonthName(new Date(2026, 0, 1)).toLowerCase()).toBe('januar')
  })
})
