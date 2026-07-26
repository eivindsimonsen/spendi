<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { startOfMonth, subMonths, subDays, format } from 'date-fns'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { usePlansStore } from '@/stores/plans.store'
import { useAuthStore } from '@/stores/auth.store'
import { useIncomeStore } from '@/stores/income.store'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useSavingsStore } from '@/stores/savings.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import { profilesService } from '@/services/profiles.service'
import { getPayPeriod, getDaysUntilPayday } from '@/core/pay-schedule'
import { buildBudgetRecommendation, type RecurringCostInput } from '@/core/budget-recommendation'
import { sumByMonth } from '@/core/transaction-stats'
import { SAVINGS_THEMES } from '@/core/savings-themes'
import type { DatedAmount } from '@/core/variable-cost-estimator'
import type { SavingsGoalTheme, Database } from '@/types/database.types'
import { formatCurrencyNOK } from '@/core/format'
import ExplainableValue from '@/components/common/ExplainableValue.vue'
import PlanPicker from '@/components/budget/PlanPicker.vue'

type Profile = Database['public']['Tables']['profiles']['Row']

const LOOKBACK_MONTHS = 3
const TREND_MONTHS = 6
const RECENT_TRANSACTIONS_PREVIEW_COUNT = 5
const RECURRING_LINE_ITEMS_COLLAPSED_COUNT = 5

const { currentPlan } = useCurrentPlan()
const plansStore = usePlansStore()
const authStore = useAuthStore()
const incomeStore = useIncomeStore()
const incomePaymentsStore = useIncomePaymentsStore()
const categoriesStore = useCategoriesStore()
const recurringCostsStore = useRecurringCostsStore()
const transactionsStore = useTransactionsStore()
const savingsStore = useSavingsStore()
const { categoryLabel } = useCategoryLabel()

watch(
  currentPlan,
  async (plan) => {
    if (!plan || !authStore.user) return
    // Fetches enough history for both the variable-cost lookback and the
    // trend chart below -- they each apply their own, independent window
    // on top of this one shared fetch.
    const sinceDate = format(startOfMonth(subMonths(new Date(), TREND_MONTHS)), 'yyyy-MM-dd')
    await Promise.all([
      incomeStore.load(plan.id, authStore.user.id),
      categoriesStore.load(plan.id),
      recurringCostsStore.load(plan.id),
      transactionsStore.loadSince(plan.id, sinceDate),
      savingsStore.load(plan.id),
    ])
  },
  { immediate: true },
)

const currentPeriod = computed(() => {
  if (!incomeStore.paySchedule) return null
  return getPayPeriod(incomeStore.paySchedule.payday, new Date())
})

const daysUntilPayday = computed(() => {
  if (!incomeStore.paySchedule) return null
  return getDaysUntilPayday(incomeStore.paySchedule.payday, new Date())
})

const planMemberProfiles = ref(new Map<string, Profile>())

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

// Resolves display names for whoever logged income, paid for a
// transaction, or created a recurring cost, so "who's responsible for
// this" can be shown without a second query per name -- fires whenever
// any of those sources picks up a not-yet-seen id.
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

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
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

  return buildBudgetRecommendation(
    periodIncomeTotal.value,
    recurringCostInputs,
    transactionsByCategory.value,
    LOOKBACK_MONTHS,
    new Date(),
  )
})

// Categories already covered by a recurring cost are excluded here --
// their amount is already accounted for in "Faste utgifter" above, so
// this is genuinely unplanned/discretionary spending, not a double-count.
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

const showAllDiscretionaryItems = ref(false)

const hasMoreDiscretionaryItems = computed(
  () => discretionaryTransactionsThisPeriod.value.length > RECURRING_LINE_ITEMS_COLLAPSED_COUNT,
)

const visibleDiscretionaryTransactions = computed(() =>
  showAllDiscretionaryItems.value
    ? discretionaryTransactionsThisPeriod.value
    : discretionaryTransactionsThisPeriod.value.slice(0, RECURRING_LINE_ITEMS_COLLAPSED_COUNT),
)

// Biggest costs first, and collapsed behind a "show more" toggle once the
// plan accumulates enough recurring costs to make the card unwieldy.
const sortedLineItems = computed(() => {
  if (!budgetRecommendation.value) return []
  return [...budgetRecommendation.value.lineItems].sort((a, b) => b.estimate.value - a.estimate.value)
})

const showAllLineItems = ref(false)

const hasMoreLineItems = computed(
  () => sortedLineItems.value.length > RECURRING_LINE_ITEMS_COLLAPSED_COUNT,
)

const visibleLineItems = computed(() =>
  showAllLineItems.value
    ? sortedLineItems.value
    : sortedLineItems.value.slice(0, RECURRING_LINE_ITEMS_COLLAPSED_COUNT),
)

function categoryIcon(categoryId: string): string {
  return categoriesStore.categories.find((category) => category.id === categoryId)?.icon ?? ''
}

const recentTransactionsPreview = computed(() =>
  transactionsStore.recentTransactions.slice(0, RECENT_TRANSACTIONS_PREVIEW_COUNT),
)

// Month-over-month trend, including months with zero spend so the shape
// of the timeline is honest rather than skipping gaps.
const trendMonths = computed(() => {
  const totalsByMonth = new Map(
    sumByMonth(
      transactionsStore.recentTransactions.map((tx) => ({
        categoryId: tx.category_id,
        amount: tx.amount,
        occurredOn: tx.occurred_on,
      })),
    ).map((entry) => [entry.month, entry.total]),
  )

  const months: { month: string; total: number }[] = []
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const key = format(subMonths(new Date(), i), 'yyyy-MM')
    months.push({ month: key, total: totalsByMonth.get(key) ?? 0 })
  }
  return months
})

const trendMax = computed(() => Math.max(1, ...trendMonths.value.map((entry) => entry.total)))

function trendBarHeight(total: number): number {
  return Math.round((total / trendMax.value) * 100)
}

function trendMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-')
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('nb-NO', {
    month: 'short',
  })
}
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>Oversikt</h1>
    </div>

    <PlanPicker v-if="plansStore.myPlans.length" />

    <section v-if="!incomeStore.loaded" class="card">
      <p>Laster …</p>
    </section>

    <section v-else-if="!incomeStore.paySchedule" class="card income-hero">
      <p class="income-hero-warning">⚠️ Du har ikke satt lønningsdag ennå.</p>
      <router-link to="/income" class="button-primary card-link-button">Sett lønningsdag</router-link>
    </section>

    <template v-else>
      <section class="card income-hero">
        <router-link to="/income" class="income-hero-link">
          <span>
            <span class="income-hero-label">Lønn denne perioden</span>
            <span class="income-hero-amount">{{ formatCurrencyNOK(periodIncomeTotal) }}</span>
          </span>
          <span class="income-hero-arrow" aria-hidden="true">›</span>
        </router-link>
        <p v-if="currentPeriod" class="card-subtitle">
          <template v-if="periodIncomeTotal === 0">
            Trykk for å logge lønn og se anbefalt budsjett.
          </template>
          <template v-else>
            {{ formatShortDate(currentPeriod.start) }} –
            {{ formatShortDate(subDays(currentPeriod.end, 1)) }} · {{ daysUntilPayday }} dager til
            neste lønning
          </template>
        </p>
      </section>

      <template v-if="budgetRecommendation">
        <section class="card">
          <h2>Anbefalt budsjett denne perioden</h2>
          <div class="budget-row budget-row-income">
            <span>Loggført lønn</span>
            <ExplainableValue :result="budgetRecommendation.income" />
          </div>

          <p class="budget-section-heading">Faste utgifter</p>
          <div v-if="sortedLineItems.length" class="budget-line-items">
            <div v-for="item in visibleLineItems" :key="item.recurringCostId" class="budget-row">
              <span>
                {{ categoryIcon(item.categoryId) }} {{ item.name }}
                <span v-if="currentPlan?.type === 'shared'" class="budget-row-owner">
                  {{ recurringCostOwnerName(item.recurringCostId) }}
                </span>
              </span>
              <ExplainableValue :result="item.estimate" />
            </div>
            <button
              v-if="hasMoreLineItems"
              type="button"
              class="button-link budget-line-items-toggle"
              @click="showAllLineItems = !showAllLineItems"
            >
              {{
                showAllLineItems
                  ? 'Vis færre'
                  : `Vis ${sortedLineItems.length - RECURRING_LINE_ITEMS_COLLAPSED_COUNT} til`
              }}
            </button>
          </div>
          <p v-else class="card-subtitle">
            Du har ingen faste utgifter registrert ennå.
            <router-link to="/recurring-costs">Legg til noen</router-link>.
          </p>

          <div class="budget-row budget-row-total">
            <span>Sum faste utgifter</span>
            <ExplainableValue :result="budgetRecommendation.totalCommitted" />
          </div>
          <div class="budget-row budget-row-remaining">
            <span>Igjen etter faste utgifter</span>
            <ExplainableValue :result="budgetRecommendation.remaining" />
          </div>

          <div class="budget-split">
            <div class="budget-row">
              <span>Fri bruk</span>
              <ExplainableValue :result="budgetRecommendation.split.fun" />
            </div>
            <div class="budget-row">
              <span>Sparing</span>
              <ExplainableValue :result="budgetRecommendation.split.savings" />
            </div>
            <div class="budget-row">
              <span>Uforutsette ting</span>
              <ExplainableValue :result="budgetRecommendation.split.unforeseen" />
            </div>
          </div>

          <template v-if="discretionaryTransactionsThisPeriod.length">
            <p class="budget-section-heading budget-section-heading-divided">Uforutsett utgift</p>
            <div class="budget-line-items">
              <div v-for="tx in visibleDiscretionaryTransactions" :key="tx.id" class="budget-row">
                <span>
                  {{ categoryLabel(tx.category_id) }}
                  <span v-if="currentPlan?.type === 'shared'" class="budget-row-owner">
                    {{ memberName(tx.paid_by) }}
                  </span>
                </span>
                <span>{{ formatCurrencyNOK(tx.amount) }}</span>
              </div>
              <button
                v-if="hasMoreDiscretionaryItems"
                type="button"
                class="button-link budget-line-items-toggle"
                @click="showAllDiscretionaryItems = !showAllDiscretionaryItems"
              >
                {{
                  showAllDiscretionaryItems
                    ? 'Vis færre'
                    : `Vis ${discretionaryTransactionsThisPeriod.length - RECURRING_LINE_ITEMS_COLLAPSED_COUNT} til`
                }}
              </button>
            </div>
          </template>
        </section>

        <section class="card">
          <router-link to="/recurring-costs" class="button-primary card-link-button">
            Faste utgifter
          </router-link>
        </section>
      </template>

      <section v-if="savingsStore.goals.length" class="card">
        <h2>Spareplaner</h2>
        <div class="savings-preview-grid">
          <router-link
            v-for="goal in savingsStore.goals"
            :key="goal.id"
            to="/savings"
            class="savings-preview-card"
            :style="{ background: SAVINGS_THEMES[goal.theme as SavingsGoalTheme].gradient }"
          >
            <span class="savings-preview-icon" aria-hidden="true">
              {{ SAVINGS_THEMES[goal.theme as SavingsGoalTheme].icon }}
            </span>
            <span class="savings-preview-name">{{ goal.name }}</span>
            <span class="savings-preview-amount">
              {{ formatCurrencyNOK(savingsStore.contributionsTotal(goal.id)) }} /
              {{ formatCurrencyNOK(goal.target_amount) }}
            </span>
          </router-link>
        </div>
        <router-link to="/savings" class="account-link savings-preview-link"
          >Administrer spareplaner →</router-link
        >
      </section>
    </template>

    <router-link to="/statistics" class="card trend-card">
      <div class="trend-card-header">
        <h2>Utvikling siste {{ TREND_MONTHS }} måneder</h2>
        <span class="income-hero-arrow" aria-hidden="true">›</span>
      </div>
      <div class="trend-chart">
        <div v-for="entry in trendMonths" :key="entry.month" class="trend-bar-col">
          <div class="trend-bar-track">
            <div class="trend-bar-fill" :style="{ height: trendBarHeight(entry.total) + '%' }" />
          </div>
          <span class="trend-bar-label">{{ trendMonthLabel(entry.month) }}</span>
        </div>
      </div>
      <p class="card-subtitle trend-card-hint">Se full statistikk →</p>
    </router-link>

    <section v-if="recentTransactionsPreview.length" class="card">
      <h2>Siste utgifter</h2>
      <ul class="recent-transactions-list">
        <li v-for="tx in recentTransactionsPreview" :key="tx.id" class="recent-transaction-item">
          <span>{{ categoryLabel(tx.category_id) }}</span>
          <span class="recent-transaction-amount">{{ formatCurrencyNOK(tx.amount) }}</span>
        </li>
      </ul>
      <router-link to="/history" class="account-link">Se all historikk →</router-link>
    </section>
  </div>
</template>

<style scoped>
.income-hero-warning {
  font-weight: 600;
  margin: 0 0 var(--space-3);
}

.income-hero-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  color: var(--color-text);
}

.income-hero-label {
  display: block;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.income-hero-amount {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.income-hero-arrow {
  font-size: 1.8rem;
  color: var(--color-text-subtle);
}

.budget-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
}

.budget-row-income {
  font-weight: 600;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-2);
}

.budget-section-heading {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-subtle);
  margin: 0 0 var(--space-1);
}

.budget-section-heading-divided {
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
}

.budget-row-owner {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-subtle);
}

.budget-line-items {
  display: flex;
  flex-direction: column;
}

.budget-line-items-toggle {
  align-self: flex-start;
  padding: var(--space-2) 0 0;
}

.budget-row-total {
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-2);
  padding-top: var(--space-3);
}

.budget-row-remaining {
  font-weight: 600;
}

.budget-split {
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  color: var(--color-success);
}

.savings-preview-grid {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  padding-bottom: var(--space-1);
  margin-bottom: var(--space-3);
}

.savings-preview-card {
  flex: 1;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  color: #fff;
  text-decoration: none;
  box-shadow: var(--shadow-sm);
}

.savings-preview-icon {
  font-size: 1.6rem;
}

.savings-preview-name {
  font-weight: 700;
}

.savings-preview-amount {
  font-size: 0.8rem;
  opacity: 0.9;
}

.savings-preview-link {
  display: block;
}

.trend-card {
  display: block;
  color: inherit;
  text-decoration: none;
}

.trend-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.trend-card-header h2 {
  margin: 0;
}

.trend-card-hint {
  margin: var(--space-2) 0 0;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  height: 120px;
}

.trend-bar-col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
}

.trend-bar-track {
  width: 100%;
  max-width: 32px;
  height: 100%;
  display: flex;
  align-items: flex-end;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.trend-bar-fill {
  width: 100%;
  background: linear-gradient(180deg, var(--color-primary), var(--color-primary-hover));
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: height 0.3s ease;
}

.trend-bar-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.recent-transactions-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-3);
}

.recent-transaction-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-border);
}

.recent-transaction-item:first-child {
  border-top: none;
  padding-top: 0;
}

.recent-transaction-amount {
  font-weight: 600;
}
</style>
