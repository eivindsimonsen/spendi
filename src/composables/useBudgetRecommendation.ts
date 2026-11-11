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
import { getDaysUntilPayday, getNextPayDate } from '@/core/pay-schedule'
import { buildBudgetRecommendation, type RecurringCostInput } from '@/core/budget-recommendation'
import { selectUnforeseenExpenses } from '@/core/unforeseen-expenses'
import type { DatedAmount } from '@/core/variable-cost-estimator'
import type { Database } from '@/types/database.types'

type Plan = Database['public']['Tables']['plans']['Row']

// How far back a variable cost's average looks. Transactions are fetched
// for exactly this window, which also always covers the current period.
const LOOKBACK_MONTHS = 3

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
    const sinceDate = format(startOfMonth(subMonths(new Date(), LOOKBACK_MONTHS)), 'yyyy-MM-dd')
    await Promise.all([
      incomeStore.load(planId, authStore.user.id),
      categoriesStore.load(),
      recurringCostsStore.loadForPlan(planId),
      transactionsStore.loadSince(planId, sinceDate),
    ])
  }, providedCurrentPlan)

  const currentPeriod = computed(() => incomeStore.currentPeriod)

  watch(
    currentPeriod,
    async (period) => {
      if (!period || !currentPlan.value) return
      await incomePaymentsStore.loadForPeriod(
        currentPlan.value.id,
        format(period.start, 'yyyy-MM-dd'),
        format(period.end, 'yyyy-MM-dd'),
      )
    },
    { immediate: true },
  )

  // Skips are looked up by planCosts' ids, which load in parallel with the
  // period -- if the period lands first, skips would be fetched for no
  // costs at all, so a planCosts change has to refetch them too.
  watch(
    [currentPeriod, () => recurringCostsStore.planCosts],
    async ([period]) => {
      if (!period) return
      await recurringCostsStore.loadSkipsForPeriod(format(period.start, 'yyyy-MM-dd'))
    },
    { immediate: true },
  )

  // Resolves display names for whoever logged income, paid for a
  // transaction, owns a recurring cost, or set a payday, so "who's
  // responsible for this" can be shown without a second query per name.
  const { nameFor: memberName } = useProfileNames(() => {
    const ids = new Set<string>()
    for (const payment of incomePaymentsStore.currentPeriodPayments) ids.add(payment.created_by)
    for (const tx of transactionsStore.recentTransactions) ids.add(tx.paid_by)
    for (const cost of recurringCostsStore.planCosts) ids.add(cost.owner_id)
    for (const profile of incomeStore.planPaydays) ids.add(profile.profile_id)
    return [...ids]
  })

  function recurringCostOwnerName(recurringCostId: string): string {
    const cost = recurringCostsStore.planCosts.find((item) => item.id === recurringCostId)
    return cost ? memberName(cost.owner_id) : 'Ukjent'
  }

  // Every plan member's own countdown to when their pay actually arrives
  // (weekend-adjusted, see getNextPayDate). Unlike `currentPeriod`'s
  // single shared boundary, this shows each person's own payday, soonest
  // first.
  const memberPaydayCountdowns = computed(() => {
    const today = new Date()
    return incomeStore.planPaydays
      .map((profile) => {
        const override = profile.period_override_start
          ? new Date(profile.period_override_start)
          : null
        return {
          profileId: profile.profile_id,
          name: memberName(profile.profile_id),
          nextPayDate: getNextPayDate(profile.payday, today, override),
          daysUntil: getDaysUntilPayday(profile.payday, today, override),
        }
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
  })

  // What "Hva har jeg igjen per dag?" counts down to: the soonest pay
  // across the plan. On an individual plan that's your own; on a shared
  // plan it's whoever gets paid first, since the household's money is
  // topped up then. `name` is only set when there's more than one
  // payday to choose between, so the explanation can say whose it is.
  const nextPayday = computed(() => {
    const [soonest] = memberPaydayCountdowns.value
    if (!soonest) return null
    return {
      daysUntil: soonest.daysUntil,
      date: soonest.nextPayDate,
      name: memberPaydayCountdowns.value.length > 1 ? soonest.name : undefined,
    }
  })

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

  const variableCostCategoryIds = computed(
    () =>
      new Set(
        recurringCostsStore.planCosts
          .filter((cost) => cost.is_variable)
          .map((cost) => cost.category_id),
      ),
  )

  const unforeseenExpensesThisPeriod = computed(() => {
    const period = currentPeriod.value
    if (!period) return []
    return selectUnforeseenExpenses(
      transactionsStore.recentTransactions.map((tx) => ({
        id: tx.id,
        name: tx.name,
        categoryId: tx.category_id,
        amount: tx.amount,
        occurredOn: tx.occurred_on,
        paidBy: tx.paid_by,
      })),
      period,
      variableCostCategoryIds.value,
    )
  })

  const budgetRecommendation = computed(() => {
    if (!incomePaymentsStore.loaded || periodIncomeTotal.value === 0) return null

    const recurringCostInputs: RecurringCostInput[] = recurringCostsStore.planCosts.map((cost) => ({
      id: cost.id,
      name: cost.name,
      categoryId: cost.category_id,
      amount: cost.amount,
      isVariable: cost.is_variable,
    }))

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
      unforeseenExpensesThisPeriod.value,
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
    nextPayday,
    memberPaydayCountdowns,
    periodIncomeTotal,
    budgetRecommendation,
    sortedLineItems,
    unforeseenExpensesThisPeriod,
    memberName,
    recurringCostOwnerName,
    categoryIcon,
    toggleRecurringCostSkip,
  }
}
