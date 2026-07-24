// Plain aggregations, not "estimates" -- a sum is self-explanatory, so
// these return bare numbers rather than a CalculationResult trace.

export interface DatedCategoryAmount {
  categoryId: string
  amount: number
  occurredOn: string // ISO date, e.g. "2026-06-15"
}

export interface CategoryTotal {
  categoryId: string
  total: number
}

export function sumByCategory(transactions: DatedCategoryAmount[]): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const tx of transactions) {
    totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount)
  }
  return Array.from(totals.entries())
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total)
}

export interface MonthTotal {
  month: string // "yyyy-MM"
  total: number
}

export function sumByMonth(transactions: DatedCategoryAmount[]): MonthTotal[] {
  const totals = new Map<string, number>()
  for (const tx of transactions) {
    const month = tx.occurredOn.slice(0, 7)
    totals.set(month, (totals.get(month) ?? 0) + tx.amount)
  }
  return Array.from(totals.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month))
}
