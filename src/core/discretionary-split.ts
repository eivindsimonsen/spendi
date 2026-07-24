import type { CalculationResult } from './types/calculation-result'

export interface DiscretionarySplit {
  fun: CalculationResult<number>
  savings: CalculationResult<number>
  unforeseen: CalculationResult<number>
}

const FUN_SHARE = 0.5
const SAVINGS_SHARE = 0.3
const UNFORESEEN_SHARE = 0.2

function splitLineItem(label: string, share: number, remaining: number): CalculationResult<number> {
  const value = remaining * share
  const sharePercent = Math.round(share * 100)

  return {
    value,
    model: 'discretionary-split-50-30-20-v1',
    summary: `${label}: ${sharePercent}% av det som er igjen etter faste kostnader.`,
    steps: [
      {
        label,
        formula: `${sharePercent}% × det som er igjen`,
        inputs: [{ label: 'Igjen etter faste kostnader', value: remaining, unit: 'kr' }],
        result: value,
      },
    ],
  }
}

// Suggests how to split what's left after fixed costs, using a 50/30/20
// rule of thumb (fun / savings / unforeseen). Clamped to zero when
// there's nothing left (or the budget is already overspent) rather than
// suggesting negative allocations.
export function splitDiscretionaryIncome(remaining: number): DiscretionarySplit {
  const safeRemaining = Math.max(remaining, 0)

  return {
    fun: splitLineItem('Fri bruk', FUN_SHARE, safeRemaining),
    savings: splitLineItem('Sparing', SAVINGS_SHARE, safeRemaining),
    unforeseen: splitLineItem('Uforutsette ting', UNFORESEEN_SHARE, safeRemaining),
  }
}
