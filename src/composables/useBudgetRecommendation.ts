import { computed, watch, type Ref } from 'vue'
import { startOfMonth, subMonths, format } from 'date-fns'
import { useLoadOnActivePlan } from './useLoadOnActivePlan'
import { useProfileNames } from './useProfileNames'
import { useCategoryLabel } from './useCategoryLabel'
import { useAuthStore } from '@/stores/auth.store'
import { useIncomeStore } from '@/stores/income.store'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { getPayPeriod, getDaysUntilPayday } from '@/core/pay-schedule'
import { buildBudgetRecommendation, type RecurringCostInput } from '@/core/budget-recommendation'
import { isWithinRange } from '@/core/date-range'
import type { DatedAmount } from '@/core/variable-cost-estimator'
import type { Database } from '@/types/database.types'

type Plan = Database['public']['Tables']['plans']['Row']

const LOOKBACK_MONTHS = 3
// Wide enough to cover both the variable-cost lookback and the
// statistics trend window, so the same fetch serves all of them.
const HISTORY_MONTHS = 6

// Everything needed to show "Anbefalt budsjett denne perioden" -- shared
// by the Overview summary panel and the full Budget detail page, and
// Income, so the period/income/recurring-cost/attribution logic lives in
// exactly one place instead of drifting apart across three views.
//
// Pass an already-resolved `currentPlan` ref if the caller also needs it
// directly (see useLoadOnActivePlan) to avoid a redundant plans fetch.
export function useBudgetRecommendation(providedCurrentPlan?: Ref<Plan | null>) {
  const authStore = useAuthStore()
  const incomeStore = useIncomeStore()
  const incomePaymentsStore = useIncomePaymentsStore()
  const categoriesStore = useCategoriesStore()
  const recurringCostsStore = useRecurringCostsStore()
  const transactionsStore = useTransactionsStore()

  const { currentPlan } = useLoadOnActivePlan(async (planId) => {
    if (!authStore.user) return
    const sinceDate = format(startOfMonth(subMonths(new Date(), HISTORY_MONTHS)), 'yyyy-MM-dd')
    await Promise.all([
      incomeStore.load(planId, authStore.user.id),
      categoriesStore.load(planId),
      recurringCostsStore.load(planId),
      transactionsStore.loadSince(planId, sinceDate),
    ])
  }, providedCurrentPlan)

  const currentPeriod = computed(() => {
    if (incomeStore.referencePayday == null) return null
    return getPayPeriod(incomeStore.referencePayday, new Date())
  })

  // Distinct from `currentPeriod` above: that one anchors to the
  // earliest payday across the whole plan (so a shared period's
  // boundary lines up for both partners), which would silently use a
  // partner's payday here on a shared plan. A personal "how much do I
  // have left per day" figure has to count down to *your own* next
  // payday instead.
  const daysUntilMyPayday = computed(() => {
    if (incomeStore.paySchedule?.payday == null) return null
    return getDaysUntilPayday(incomeStore.paySchedule.payday, new Date())
  })

  watch(
    currentPeriod,
    async (period) => {
      if (!period || !currentPlan.value) return
      await Promise.all([
        incomePaymentsStore.loadForPeriod(
          currentPlan.value.id,
          format(period.start, 'yyyy-MM-dd'),
          format(period.end, 'yyyy-MM-dd'),
        ),
        recurringCostsStore.loadSkipsForPeriod(format(period.start, 'yyyy-MM-dd')),
      ])
    },
    { immediate: true },
  )

  // Resolves display names for whoever logged income, paid for a
  // transaction, created a recurring cost, or set a payday, so "who's
  // responsible for this" can be shown without a second query per name.
  const { nameFor: memberName } = useProfileNames(() => {
    const ids = new Set<string>()
    for (const payment of incomePaymentsStore.currentPeriodPayments) ids.add(payment.created_by)
    for (const tx of transactionsStore.recentTransactions) ids.add(tx.paid_by)
    for (const cost of recurringCostsStore.recurringCosts) ids.add(cost.created_by)
    for (const profile of incomeStore.planPaydays) ids.add(profile.profile_id)
    return [...ids]
  })

  function recurringCostOwnerName(recurringCostId: string): string {
    const cost = recurringCostsStore.recurringCosts.find((item) => item.id === recurringCostId)
    return cost ? memberName(cost.created_by) : 'Ukjent'
  }

  // Every plan member's own countdown to their next payday -- unlike
  // `currentPeriod`'s single shared boundary, this shows each person's
  // actual payday, soonest first.
  const memberPaydayCountdowns = computed(() =>
    incomeStore.planPaydays
      .map((profile) => ({
        profileId: profile.profile_id,
        name: memberName(profile.profile_id),
        daysUntil: getDaysUntilPayday(profile.payday, new Date()),
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil),
  )

  const periodIncomeTotal = computed(() =>
    incomePaymentsStore.currentPeriodPayments.reduce((sum, payment) => sum + payment.amount, 0),
  )

  const transactionsByCategory = computed(() => {
    const map = new Map<string, DatedAmount[]>()
    for (const tx of transactionsStore.recentTransactions) {
      const existing = map.get(tx.category_id) ?? []
      existing.push({ amount: tx.amount, occurredOn: tx.occurred_on })
      map.set(tx.category_id, existing)
    }
    return map
  })

  const budgetRecommendation = computed(() => {
    if (!incomePaymentsStore.loaded || periodIncomeTotal.value === 0) return null

    const recurringCostInputs: RecurringCostInput[] = recurringCostsStore.recurringCosts.map(
      (cost) => ({
        id: cost.id,
        name: cost.name,
        categoryId: cost.category_id,
        amount: cost.amount,
        isVariable: cost.is_variable,
      }),
    )

    const skippedIds = new Set(
      recurringCostsStore.skippedThisPeriod.map((skip) => skip.recurring_cost_id),
    )

    return buildBudgetRecommendation(
      periodIncomeTotal.value,
      recurringCostInputs,
      transactionsByCategory.value,
      LOOKBACK_MONTHS,
      new Date(),
      currentPlan.value?.budget_model,
      skippedIds,
    )
  })

  function toggleRecurringCostSkip(recurringCostId: string) {
    const period = currentPeriod.value
    if (!period) return
    if (recurringCostsStore.isSkipped(recurringCostId)) {
      return recurringCostsStore.unskipForPeriod(recurringCostId)
    }
    return recurringCostsStore.skipForPeriod(recurringCostId, format(period.start, 'yyyy-MM-dd'))
  }

  // Categories already covered by a recurring cost are excluded here --
  // their amount is already accounted for in "Faste utgifter", so this
  // is genuinely unplanned/discretionary spending, not a double-count.
  const recurringCostCategoryIds = computed(
    () => new Set(recurringCostsStore.recurringCosts.map((cost) => cost.category_id)),
  )

  const discretionaryTransactionsThisPeriod = computed(() => {
    const period = currentPeriod.value
    if (!period) return []
    return transactionsStore.recentTransactions
      .filter(
        (tx) =>
          isWithinRange(new Date(tx.occurred_on), period.start, period.end) &&
          !recurringCostCategoryIds.value.has(tx.category_id),
      )
      .sort((a, b) => b.amount - a.amount)
  })

  // Biggest costs first -- callers decide whether/how to collapse a long
  // list behind a "show more" toggle.
  const sortedLineItems = computed(() => {
    if (!budgetRecommendation.value) return []
    return [...budgetRecommendation.value.lineItems].sort(
      (a, b) => b.estimate.value - a.estimate.value,
    )
  })

  const { categoryIcon } = useCategoryLabel()

  return {
    currentPeriod,
    daysUntilMyPayday,
    memberPaydayCountdowns,
    periodIncomeTotal,
    budgetRecommendation,
    sortedLineItems,
    discretionaryTransactionsThisPeriod,
    memberName,
    recurringCostOwnerName,
    categoryIcon,
    toggleRecurringCostSkip,
  }
}
