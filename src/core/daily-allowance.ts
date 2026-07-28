import type { CalculationResult } from './types/calculation-result'

// If today IS payday (or something upstream is off), there's no "days
// left to stretch this across" to divide by -- treat the whole amount
// as available right now rather than dividing by zero.
const MIN_DAYS = 1

// A quick, ad-hoc calculator: given an amount the user currently has,
// how much is that per day until the next payday? Not tied to any
// stored data -- purely a live scratchpad figure.
export function calculateDailyAllowance(
  currentAmount: number,
  daysUntilPayday: number,
): CalculationResult<number> {
  const safeAmount = Math.max(currentAmount, 0)
  const days = Math.max(Math.round(daysUntilPayday), MIN_DAYS)
  const value = safeAmount / days

  return {
    value,
    model: 'daily-allowance-v1',
    summary: `${safeAmount} kr fordelt på ${days} dag${days === 1 ? '' : 'er'} til lønn.`,
    steps: [
      {
        label: 'Til rådighet per dag',
        formula: 'beløp ÷ dager til lønn',
        inputs: [
          { label: 'Beløp', value: safeAmount, unit: 'kr' },
          { label: 'Dager til lønn', value: days },
        ],
        result: value,
      },
    ],
  }
}

export type DailyAllowanceFeedbackLevel = 'comfortable' | 'moderate' | 'tight' | 'unknown'

export interface DailyAllowanceFeedback {
  level: DailyAllowanceFeedbackLevel
  message: string
}

// Compares the entered amount's daily rate against the recommended "Fri
// bruk" (discretionary) daily rate from the budget recommendation --
// `recommendedDailyRate` is null when there's no recommendation to
// compare against yet (e.g. no income logged this period).
export function classifyDailyAllowance(
  dailyAmount: number,
  recommendedDailyRate: number | null,
): DailyAllowanceFeedback {
  if (recommendedDailyRate === null || recommendedDailyRate <= 0) {
    return {
      level: 'unknown',
      message: 'Logg lønn for perioden for å få en vurdering av om dette er nok.',
    }
  }

  const ratio = dailyAmount / recommendedDailyRate

  if (ratio >= 1) {
    return {
      level: 'comfortable',
      message: 'God margin frem til lønn — dere kan slappe av.',
    }
  }

  if (ratio >= 0.5) {
    return {
      level: 'moderate',
      message: 'Det går rundt, men hold litt igjen frem til lønn.',
    }
  }

  return {
    level: 'tight',
    message: 'Stramt frem til lønn — vær ekstra sparsom.',
  }
}
