import type { DatedAmount } from './variable-cost-estimator'

export interface MonthlyIncomeExpense {
  month: string // "yyyy-MM"
  income: number
  expense: number
  net: number
}

// Merges income payments and expense transactions onto a caller-supplied
// list of months (so months with no activity still show as zero, matching
// the zero-filled trend chart elsewhere) -- powers an income-vs-spend view.
export function summarizeMonthlyIncomeExpense(
  months: string[],
  incomePayments: DatedAmount[],
  expenseTransactions: DatedAmount[],
): MonthlyIncomeExpense[] {
  const incomeByMonth = new Map<string, number>()
  for (const payment of incomePayments) {
    const month = payment.occurredOn.slice(0, 7)
    incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + payment.amount)
  }

  const expenseByMonth = new Map<string, number>()
  for (const tx of expenseTransactions) {
    const month = tx.occurredOn.slice(0, 7)
    expenseByMonth.set(month, (expenseByMonth.get(month) ?? 0) + tx.amount)
  }

  return months.map((month) => {
    const income = incomeByMonth.get(month) ?? 0
    const expense = expenseByMonth.get(month) ?? 0
    return { month, income, expense, net: income - expense }
  })
}

// Share of logged income left over after expenses, across the whole
// window -- null when no income was logged at all (a rate can't be
// expressed against a zero base).
export function calculateSavingsRate(months: MonthlyIncomeExpense[]): number | null {
  const totalIncome = months.reduce((sum, month) => sum + month.income, 0)
  if (totalIncome === 0) return null
  const totalNet = months.reduce((sum, month) => sum + month.net, 0)
  return Math.round((totalNet / totalIncome) * 100)
}
