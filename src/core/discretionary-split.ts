import type { CalculationResult } from './types/calculation-result'

export type BudgetModelId = 'balanced-50-30-20' | 'savings-focused-30-50-20' | 'relaxed-70-20-10'

export interface BudgetModelDefinition {
  id: BudgetModelId
  label: string
  description: string
  funShare: number
  savingsShare: number
  unforeseenShare: number
}

export const DEFAULT_BUDGET_MODEL: BudgetModelId = 'balanced-50-30-20'

// Named alternatives to the classic 50/30/20 rule, all applied the same
// way in this app: as a split of what's left over after fixed costs
// (not of total income), across the same three buckets.
export const BUDGET_MODELS: Record<BudgetModelId, BudgetModelDefinition> = {
  'balanced-50-30-20': {
    id: 'balanced-50-30-20',
    label: 'Balansert (50/30/20)',
    description:
      'Den klassiske tommelfingerregelen: halvparten til fri bruk, resten delt mellom sparing og uforutsette ting.',
    funShare: 0.5,
    savingsShare: 0.3,
    unforeseenShare: 0.2,
  },
  'savings-focused-30-50-20': {
    id: 'savings-focused-30-50-20',
    label: 'Sparefokusert (30/50/20)',
    description: 'Prioriterer sparing tungt — for når dere har et konkret mål å spare ekstra til.',
    funShare: 0.3,
    savingsShare: 0.5,
    unforeseenShare: 0.2,
  },
  'relaxed-70-20-10': {
    id: 'relaxed-70-20-10',
    label: 'Avslappet (70/20/10)',
    description: 'Mer albuerom til fri bruk i hverdagen, med en mindre buffer til sparing og uforutsett.',
    funShare: 0.7,
    savingsShare: 0.2,
    unforeseenShare: 0.1,
  },
}

export interface DiscretionarySplit {
  fun: CalculationResult<number>
  savings: CalculationResult<number>
  unforeseen: CalculationResult<number>
}

function splitLineItem(
  label: string,
  share: number,
  remaining: number,
  model: BudgetModelDefinition,
): CalculationResult<number> {
  const value = remaining * share
  const sharePercent = Math.round(share * 100)

  return {
    value,
    model: `discretionary-split-${model.id}`,
    summary: `${label}: ${sharePercent}% av det som er igjen etter faste kostnader (${model.label}).`,
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

// Suggests how to split what's left after fixed costs into fun/savings/
// unforeseen, using the chosen budget model (defaults to 50/30/20).
// Clamped to zero when there's nothing left (or the budget is already
// overspent) rather than suggesting negative allocations.
export function splitDiscretionaryIncome(
  remaining: number,
  modelId: BudgetModelId = DEFAULT_BUDGET_MODEL,
): DiscretionarySplit {
  const safeRemaining = Math.max(remaining, 0)
  const model = BUDGET_MODELS[modelId]

  return {
    fun: splitLineItem('Fri bruk', model.funShare, safeRemaining, model),
    savings: splitLineItem('Sparing', model.savingsShare, safeRemaining, model),
    unforeseen: splitLineItem('Uforutsette ting', model.unforeseenShare, safeRemaining, model),
  }
}
