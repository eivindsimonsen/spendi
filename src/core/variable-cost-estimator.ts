import { startOfMonth, subMonths } from 'date-fns'
import type { CalculationResult } from './types/calculation-result'

export interface DatedAmount {
  amount: number
  occurredOn: string // ISO date, e.g. "2026-06-15"
}

// Estimates a variable recurring cost (e.g. electricity) as the average of
// actual logged transactions in its category over the last `lookbackMonths`
// full months, excluding the current (still in-progress) month.
export function estimateVariableCost(
  transactions: DatedAmount[],
  lookbackMonths: number,
  referenceDate: Date,
): CalculationResult<number> {
  const windowStart = startOfMonth(subMonths(referenceDate, lookbackMonths))
  const windowEnd = startOfMonth(referenceDate)

  const monthTotals = new Map<string, number>()
  for (const tx of transactions) {
    const occurred = new Date(tx.occurredOn)
    if (occurred >= windowStart && occurred < windowEnd) {
      const monthKey = `${occurred.getFullYear()}-${String(occurred.getMonth() + 1).padStart(2, '0')}`
      monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + tx.amount)
    }
  }

  const monthsWithData = monthTotals.size

  if (monthsWithData === 0) {
    return {
      value: 0,
      model: 'variable-cost-rolling-average-v1',
      summary: 'Ingen tidligere utgifter registrert i denne kategorien ennå.',
      steps: [{ label: 'Snittestimat', inputs: [], result: 0 }],
    }
  }

  const monthlyInputs = Array.from(monthTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ label: month, value: total, unit: 'kr' }))

  const sum = Array.from(monthTotals.values()).reduce((total, value) => total + value, 0)
  const average = sum / monthsWithData

  return {
    value: average,
    model: 'variable-cost-rolling-average-v1',
    summary: `Snitt av de siste ${monthsWithData} måned${monthsWithData === 1 ? '' : 'ene'} med registrerte utgifter.`,
    steps: [
      {
        label: 'Snittestimat',
        formula: `sum(${monthsWithData} siste måneder) ÷ ${monthsWithData}`,
        inputs: monthlyInputs,
        result: average,
      },
    ],
  }
}
