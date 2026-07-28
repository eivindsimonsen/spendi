import { computed, watch } from 'vue'
import { format, startOfMonth, subMonths, addDays } from 'date-fns'
import { useCurrentPlan } from './useCurrentPlan'
import { useIncomeStore } from '@/stores/income.store'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useSavingsStore } from '@/stores/savings.store'
import { getPastPeriods, summarizePeriod } from '@/core/period-history'
import type { DatedAmount } from '@/core/variable-cost-estimator'

const PERIOD_COUNT = 6
const HISTORY_MONTHS = 6

// Past periods' results (income logged, total spent, amount saved) for
// the Budget page's "Tidligere perioder" section -- separate from
// useBudgetRecommendation since it's a distinct concern (looking back,
// not projecting the current period).
export function usePeriodHistory() {
  const { currentPlan } = useCurrentPlan()
  const incomeStore = useIncomeStore()
  const incomePaymentsStore = useIncomePaymentsStore()
  const transactionsStore = useTransactionsStore()
  const savingsStore = useSavingsStore()

  watch(
    currentPlan,
    async (plan) => {
      if (!plan) return
      const sinceDate = format(startOfMonth(subMonths(new Date(), HISTORY_MONTHS)), 'yyyy-MM-dd')
      const untilDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
      await Promise.all([
        incomePaymentsStore.loadHistory(plan.id, sinceDate, untilDate),
        savingsStore.load(plan.id),
      ])
    },
    { immediate: true },
  )

  const pastPeriods = computed(() => {
    if (incomeStore.referencePayday == null) return []
    return getPastPeriods(incomeStore.referencePayday, new Date(), PERIOD_COUNT)
  })

  const allContributions = computed(() => {
    const list: DatedAmount[] = []
    for (const contributions of savingsStore.contributionsByGoal.values()) {
      for (const contribution of contributions) {
        list.push({ amount: contribution.amount, occurredOn: contribution.occurred_on })
      }
    }
    return list
  })

  const periodSummaries = computed(() =>
    pastPeriods.value.map((period) =>
      summarizePeriod(
        period,
        incomePaymentsStore.historyPayments.map((payment) => ({
          amount: payment.amount,
          occurredOn: payment.received_on,
        })),
        transactionsStore.recentTransactions.map((tx) => ({
          amount: tx.amount,
          occurredOn: tx.occurred_on,
        })),
        allContributions.value,
      ),
    ),
  )

  return { periodSummaries }
}
