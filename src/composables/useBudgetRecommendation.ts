import { ref, computed, watch } from 'vue'
import { startOfMonth, subMonths, format } from 'date-fns'
import { useCurrentPlan } from './useCurrentPlan'
import { useAuthStore } from '@/stores/auth.store'
import { useIncomeStore } from '@/stores/income.store'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { profilesService } from '@/services/profiles.service'
import { getPayPeriod, getDaysUntilPayday } from '@/core/pay-schedule'
import { buildBudgetRecommendation, type RecurringCostInput } from '@/core/budget-recommendation'
import type { DatedAmount } from '@/core/variable-cost-estimator'
import type { BudgetModelId } from '@/core/discretionary-split'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

const LOOKBACK_MONTHS = 3
// Wide enough to cover both the variable-cost lookback and the
// statistics trend window, so the same fetch serves all of them.
const HISTORY_MONTHS = 6

// Everything needed to show "Anbefalt budsjett denne perioden" -- shared
// by the Overview summary panel and the full Budget detail page, so the
// period/income/recurring-cost/attribution logic lives in exactly one
// place instead of drifting apart across two views.
export function useBudgetRecommendation() {
  const { currentPlan } = useCurrentPlan()
  const authStore = useAuthStore()
  const incomeStore = useIncomeStore()
  const incomePaymentsStore = useIncomePaymentsStore()
  const categoriesStore = useCategoriesStore()
  const recurringCostsStore = useRecurringCostsStore()
  const transactionsStore = useTransactionsStore()

  watch(
    currentPlan,
    async (plan) => {
      if (!plan || !authStore.user) return
      const sinceDate = format(startOfMonth(subMonths(new Date(), HISTORY_MONTHS)), 'yyyy-MM-dd')
      await Promise.all([
        incomeStore.load(plan.id, authStore.user.id),
        categoriesStore.load(plan.id),
        recurringCostsStore.load(plan.id),
        transactionsStore.loadSince(plan.id, sinceDate),
      ])
    },
    { immediate: true },
  )

  const currentPeriod = computed(() => {
    if (incomeStore.referencePayday == null) return null
    return getPayPeriod(incomeStore.referencePayday, new Date())
  })

  const daysUntilPayday = computed(() => {
    if (incomeStore.referencePayday == null) return null
    return getDaysUntilPayday(incomeStore.referencePayday, new Date())
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
  // transaction, or created a recurring cost, so "who's responsible for
  // this" can be shown without a second query per name.
  const planMemberProfiles = ref(new Map<string, Profile>())

  watch(
    () =>
      [
        incomePaymentsStore.currentPeriodPayments,
        transactionsStore.recentTransactions,
        recurringCostsStore.recurringCosts,
      ] as const,
    async ([payments, transactions, recurringCosts]) => {
      const ids = new Set<string>()
      for (const payment of payments) ids.add(payment.created_by)
      for (const tx of transactions) ids.add(tx.paid_by)
      for (const cost of recurringCosts) ids.add(cost.created_by)

      const missingIds = [...ids].filter((id) => !planMemberProfiles.value.has(id))
      if (!missingIds.length) return

      const profiles = await profilesService.listByIds(missingIds)
      for (const profile of profiles) {
        planMemberProfiles.value.set(profile.id, profile)
      }
    },
    { immediate: true, deep: true },
  )

  function memberName(profileId: string): string {
    return planMemberProfiles.value.get(profileId)?.display_name ?? 'Ukjent'
  }

  function recurringCostOwnerName(recurringCostId: string): string {
    const cost = recurringCostsStore.recurringCosts.find((item) => item.id === recurringCostId)
    return cost ? memberName(cost.created_by) : 'Ukjent'
  }

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

    const recurringCostInputs: RecurringCostInput[] = recurringCostsStore.recurringCosts.map((cost) => ({
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
      currentPlan.value?.budget_model as BudgetModelId | undefined,
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
      .filter((tx) => {
        const occurred = new Date(tx.occurred_on)
        const inPeriod = occurred >= period.start && occurred < period.end
        return inPeriod && !recurringCostCategoryIds.value.has(tx.category_id)
      })
      .sort((a, b) => b.amount - a.amount)
  })

  // Biggest costs first -- callers decide whether/how to collapse a long
  // list behind a "show more" toggle.
  const sortedLineItems = computed(() => {
    if (!budgetRecommendation.value) return []
    return [...budgetRecommendation.value.lineItems].sort((a, b) => b.estimate.value - a.estimate.value)
  })

  function categoryIcon(categoryId: string): string {
    return categoriesStore.categories.find((category) => category.id === categoryId)?.icon ?? ''
  }

  return {
    currentPeriod,
    daysUntilPayday,
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
