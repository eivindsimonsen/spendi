import { subDays } from 'date-fns'
import { getPayPeriod, type PayPeriod } from './pay-schedule'
import type { DatedAmount } from './variable-cost-estimator'
import { isWithinRange } from './date-range'

// Walks backward from the current period, producing `count` prior period
// boundaries (most recent first) -- each one found by asking for the
// period containing the day right before the previous one started.
export function getPastPeriods(payday: number, referenceDate: Date, count: number): PayPeriod[] {
  const periods: PayPeriod[] = []
  let boundary = getPayPeriod(payday, referenceDate).start

  for (let i = 0; i < count; i++) {
    const dayBefore = subDays(boundary, 1)
    const period = getPayPeriod(payday, dayBefore)
    periods.push(period)
    boundary = period.start
  }

  return periods
}

export interface PeriodSummary {
  period: PayPeriod
  income: number
  spent: number
  saved: number
}

// Plain historical sums (not estimates), so no CalculationResult here --
// these are exactly what was logged, nothing modeled or projected.
export function summarizePeriod(
  period: PayPeriod,
  incomePayments: DatedAmount[],
  transactions: DatedAmount[],
  savingsContributions: DatedAmount[],
): PeriodSummary {
  function sumInRange(items: DatedAmount[]): number {
    return items
      .filter((item) => isWithinRange(new Date(item.occurredOn), period.start, period.end))
      .reduce((sum, item) => sum + item.amount, 0)
  }

  return {
    period,
    income: sumInRange(incomePayments),
    spent: sumInRange(transactions),
    saved: sumInRange(savingsContributions),
  }
}
