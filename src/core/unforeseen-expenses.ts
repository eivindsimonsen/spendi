import type { PayPeriod } from './pay-schedule'
import { isWithinRange } from './date-range'

export interface LoggedExpense {
  id: string
  name: string
  categoryId: string
  amount: number
  occurredOn: string // ISO date, e.g. "2026-06-15"
}

// Which logged expenses count as unforeseen spending in a period: every
// one inside it, except those in the category of a variable recurring
// cost. Those are that cost's actual bills -- its rolling average is
// built from exactly these transactions (see variable-cost-estimator.ts),
// so counting them here as well would deduct the same money twice.
//
// Generic so callers can pass richer rows (e.g. who paid) and get the
// same objects back. Biggest first, the order the budget lists them in.
export function selectUnforeseenExpenses<T extends LoggedExpense>(
  expenses: readonly T[],
  period: PayPeriod,
  variableCostCategoryIds: ReadonlySet<string>,
): T[] {
  return expenses
    .filter(
      (expense) =>
        isWithinRange(new Date(expense.occurredOn), period.start, period.end) &&
        !variableCostCategoryIds.has(expense.categoryId),
    )
    .sort((a, b) => b.amount - a.amount)
}
