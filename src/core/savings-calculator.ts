import { differenceInMonths } from 'date-fns'
import type { CalculationResult } from './types/calculation-result'

export interface SavingsGoalInput {
  targetAmount: number
  currentAmount: number
  targetDate: Date
}

// Months remaining is floored (not rounded/ceiled) so the per-month
// figure is a slight overestimate rather than an underestimate -- better
// to save a bit more than the plan falls short by the target date.
export function calculateRequiredMonthlySavings(
  goal: SavingsGoalInput,
  referenceDate: Date,
): CalculationResult<number> {
  const remaining = goal.targetAmount - goal.currentAmount

  if (remaining <= 0) {
    return {
      value: 0,
      model: 'savings-goal-met',
      summary: 'Du har allerede nådd sparemålet!',
      steps: [{ label: 'Gjenstående', inputs: [], result: 0 }],
    }
  }

  const monthsRemaining = differenceInMonths(goal.targetDate, referenceDate)

  if (monthsRemaining < 1) {
    return {
      value: remaining,
      model: 'savings-goal-due-soon',
      summary: 'Måldatoen er denne måneden eller har passert, så hele det gjenstående beløpet trengs nå.',
      steps: [
        {
          label: 'Gjenstående beløp',
          inputs: [
            { label: 'Sparemål', value: goal.targetAmount, unit: 'kr' },
            { label: 'Spart så langt', value: goal.currentAmount, unit: 'kr' },
          ],
          result: remaining,
        },
      ],
    }
  }

  const perMonth = remaining / monthsRemaining

  return {
    value: perMonth,
    model: 'savings-goal-linear-v1',
    summary: `${monthsRemaining} måned${monthsRemaining === 1 ? '' : 'er'} igjen til måldatoen.`,
    steps: [
      {
        label: 'Nødvendig sparing per måned',
        formula: 'gjenstående ÷ måneder igjen',
        inputs: [
          { label: 'Gjenstående', value: remaining, unit: 'kr' },
          { label: 'Måneder igjen', value: monthsRemaining },
        ],
        result: perMonth,
      },
    ],
  }
}
