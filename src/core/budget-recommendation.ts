import type { CalculationResult } from './types/calculation-result'
import { estimateVariableCost, type DatedAmount } from './variable-cost-estimator'
import {
  splitDiscretionaryIncome,
  DEFAULT_BUDGET_MODEL,
  type DiscretionarySplit,
  type BudgetModelId,
} from './discretionary-split'

export interface RecurringCostInput {
  id: string
  name: string
  categoryId: string
  amount: number | null
  isVariable: boolean
}

export interface BudgetLineItem {
  recurringCostId: string
  name: string
  categoryId: string
  estimate: CalculationResult<number>
  // True when skipped for this specific period (e.g. "didn't pay this
  // one this month") -- still shown so it can be brought back, but
  // excluded from totalCommitted/remaining/split below.
  skipped: boolean
}

export interface BudgetRecommendation {
  income: CalculationResult<number>
  lineItems: BudgetLineItem[]
  totalCommitted: CalculationResult<number>
  remaining: CalculationResult<number>
  split: DiscretionarySplit
}

export function manualCostEstimate(amount: number): CalculationResult<number> {
  return {
    value: amount,
    model: 'manual-entry',
    summary: 'Du har satt dette beløpet manuelt.',
    steps: [{ label: 'Manuelt beløp', inputs: [], result: amount }],
  }
}

function loggedIncomeResult(amount: number): CalculationResult<number> {
  return {
    value: amount,
    model: 'logged-income',
    summary: 'Beløpet du har logget som mottatt for denne lønningsperioden.',
    steps: [{ label: 'Loggført lønn', inputs: [], result: amount }],
  }
}

function estimateVariableCostWithFallback(
  cost: RecurringCostInput,
  transactionsByCategory: Map<string, DatedAmount[]>,
  lookbackMonths: number,
  referenceDate: Date,
): CalculationResult<number> {
  const estimate = estimateVariableCost(
    transactionsByCategory.get(cost.categoryId) ?? [],
    lookbackMonths,
    referenceDate,
  )

  // No logged history yet to average -- fall back to the manual estimate
  // entered when the cost was created, rather than showing 0 kr.
  if (estimate.value === 0 && cost.amount != null) {
    return {
      value: cost.amount,
      model: 'manual-fallback-no-history',
      summary: `Ingen tidligere utgifter registrert ennå, så vi bruker det manuelle anslaget ditt på ${cost.amount} kr.`,
      steps: [
        {
          label: 'Manuelt anslag (midlertidig, til historikk finnes)',
          inputs: [],
          result: cost.amount,
        },
      ],
    }
  }

  return estimate
}

// `loggedIncomeAmount` is the sum of income_payments logged for the
// current pay period (see core/pay-schedule.ts) -- there's no smoothed
// estimate anymore, since a real logged number is always used instead.
export function buildBudgetRecommendation(
  loggedIncomeAmount: number,
  recurringCosts: RecurringCostInput[],
  transactionsByCategory: Map<string, DatedAmount[]>,
  lookbackMonths: number,
  referenceDate: Date,
  budgetModelId: BudgetModelId = DEFAULT_BUDGET_MODEL,
  skippedRecurringCostIds: ReadonlySet<string> = new Set(),
): BudgetRecommendation {
  const income = loggedIncomeResult(loggedIncomeAmount)

  const lineItems: BudgetLineItem[] = recurringCosts.map((cost) => {
    const estimate = cost.isVariable
      ? estimateVariableCostWithFallback(
          cost,
          transactionsByCategory,
          lookbackMonths,
          referenceDate,
        )
      : manualCostEstimate(cost.amount ?? 0)

    return {
      recurringCostId: cost.id,
      name: cost.name,
      categoryId: cost.categoryId,
      estimate,
      skipped: skippedRecurringCostIds.has(cost.id),
    }
  })

  const committedItems = lineItems.filter((item) => !item.skipped)
  const totalCommittedValue = committedItems.reduce((sum, item) => sum + item.estimate.value, 0)
  const skippedCount = lineItems.length - committedItems.length

  const totalCommitted: CalculationResult<number> = {
    value: totalCommittedValue,
    model: 'sum-of-recurring-costs-v1',
    summary: `Sum av ${committedItems.length} fast${committedItems.length === 1 ? '' : 'e'} kostnad${committedItems.length === 1 ? '' : 'er'}${skippedCount ? ` (${skippedCount} hoppet over denne perioden)` : ''}.`,
    steps: [
      {
        label: 'Sum faste kostnader',
        formula: committedItems.map((item) => item.name).join(' + ') || '0',
        inputs: committedItems.map((item) => ({
          label: item.name,
          value: item.estimate.value,
          unit: 'kr',
        })),
        result: totalCommittedValue,
      },
    ],
  }

  const remainingValue = income.value - totalCommittedValue

  const remaining: CalculationResult<number> = {
    value: remainingValue,
    model: 'income-minus-committed-costs-v1',
    summary: 'Det som er igjen av inntekten etter faste kostnader.',
    steps: [
      {
        label: 'Fritt til rådighet',
        formula: 'loggført lønn − sum faste kostnader',
        inputs: [
          { label: 'Loggført lønn', value: income.value, unit: 'kr' },
          { label: 'Sum faste kostnader', value: totalCommittedValue, unit: 'kr' },
        ],
        result: remainingValue,
      },
    ],
  }

  const split = splitDiscretionaryIncome(remainingValue, budgetModelId)

  return { income, lineItems, totalCommitted, remaining, split }
}
