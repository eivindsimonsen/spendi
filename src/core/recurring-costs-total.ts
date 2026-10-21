import type { CalculationResult } from './types/calculation-result'
import type { RecurringCostInput } from './budget-recommendation'

export type RecurringCostAmount = Pick<RecurringCostInput, 'name' | 'amount' | 'isVariable'>

// The monthly total of your recurring costs as you entered them, so a
// variable cost counts with its manual estimate here. The budget instead
// averages what you actually spent on it once there's history (see
// budget-recommendation.ts), which is why the two totals can differ.
export function sumRecurringCosts(costs: RecurringCostAmount[]): CalculationResult<number> {
  const total = costs.reduce((sum, cost) => sum + (cost.amount ?? 0), 0)
  const variableCount = costs.filter((cost) => cost.isVariable).length
  const isSingle = costs.length === 1

  let summary = `Sum av ${costs.length} fast${isSingle ? '' : 'e'} utgift${isSingle ? '' : 'er'} per måned, slik du har lagt ${isSingle ? 'den' : 'dem'} inn.`
  if (variableCount) {
    summary += ` ${variableCount} av dem varierer, og der er anslaget ditt brukt – budsjettet bruker i stedet snittet av det du faktisk har brukt, når det finnes historikk.`
  }

  return {
    value: total,
    model: 'sum-of-entered-recurring-costs-v1',
    summary,
    steps: [
      {
        label: 'Sum faste utgifter',
        formula: costs.map((cost) => cost.name).join(' + ') || '0',
        inputs: costs.map((cost) => ({
          label: cost.isVariable ? `${cost.name} (anslag)` : cost.name,
          value: cost.amount ?? 0,
          unit: 'kr',
        })),
        result: total,
      },
    ],
  }
}
