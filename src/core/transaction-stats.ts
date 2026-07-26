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

export interface CategoryShare extends CategoryTotal {
  percentage: number // 0-100, this category's share of the grand total
}

// Ranks categories by spend and attaches each one's share of the whole --
// e.g. for a "top categories" breakdown on the statistics page.
export function topCategories(transactions: DatedCategoryAmount[], limit: number): CategoryShare[] {
  const totals = sumByCategory(transactions)
  const grandTotal = totals.reduce((sum, category) => sum + category.total, 0)
  return totals.slice(0, limit).map((category) => ({
    ...category,
    percentage: grandTotal === 0 ? 0 : Math.round((category.total / grandTotal) * 100),
  }))
}

export interface MonthOverMonthChange {
  previousTotal: number
  currentTotal: number
  changePercentage: number | null // null when there's no non-zero previous month to compare against
}

// Compares the last two entries of an ordered, chronological month list
// (e.g. a zero-filled 6-month trend) -- powers a "+12% fra forrige måned"
// style callout.
export function monthOverMonthChange(months: MonthTotal[]): MonthOverMonthChange {
  const previousTotal = months.length >= 2 ? months[months.length - 2]!.total : 0
  const currentTotal = months.length >= 1 ? months[months.length - 1]!.total : 0
  const changePercentage =
    previousTotal === 0 ? null : Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
  return { previousTotal, currentTotal, changePercentage }
}
