<script setup lang="ts">
import { computed, watch } from 'vue'
import { startOfMonth, subMonths, subDays, format } from 'date-fns'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { usePlansStore } from '@/stores/plans.store'
import { useIncomeStore } from '@/stores/income.store'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import { getPayPeriod, getDaysUntilPayday } from '@/core/pay-schedule'
import { buildBudgetRecommendation, type RecurringCostInput } from '@/core/budget-recommendation'
import type { DatedAmount } from '@/core/variable-cost-estimator'
import { formatCurrencyNOK } from '@/core/format'
import ExplainableValue from '@/components/common/ExplainableValue.vue'
import PayScheduleForm from '@/components/budget/PayScheduleForm.vue'
import LogIncomeForm from '@/components/budget/LogIncomeForm.vue'

const LOOKBACK_MONTHS = 3
const RECENT_TRANSACTIONS_PREVIEW_COUNT = 5

const { currentPlan } = useCurrentPlan()
const plansStore = usePlansStore()
const incomeStore = useIncomeStore()
const incomePaymentsStore = useIncomePaymentsStore()
const categoriesStore = useCategoriesStore()
const recurringCostsStore = useRecurringCostsStore()
const transactionsStore = useTransactionsStore()
const { categoryLabel } = useCategoryLabel()

watch(
  currentPlan,
  async (plan) => {
    if (!plan) return
    const sinceDate = format(startOfMonth(subMonths(new Date(), LOOKBACK_MONTHS)), 'yyyy-MM-dd')
    await Promise.all([
      incomeStore.load(plan.id),
      categoriesStore.load(plan.id),
      recurringCostsStore.load(plan.id),
      transactionsStore.loadSince(plan.id, sinceDate),
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

// Categories already covered by a recurring cost are excluded here, since
// their amount is already accounted for in the budget's committed-costs
// total -- this tracks genuinely discretionary spending against what's
// left over, not a double-count of planned costs.
const recurringCostCategoryIds = computed(
  () => new Set(recurringCostsStore.recurringCosts.map((cost) => cost.category_id)),
)

const spentThisPeriod = computed(() => {
  const period = currentPeriod.value
  if (!period) return 0
  return transactionsStore.recentTransactions
    .filter((tx) => {
      const occurred = new Date(tx.occurred_on)
      const inPeriod = occurred >= period.start && occurred < period.end
      return inPeriod && !recurringCostCategoryIds.value.has(tx.category_id)
    })
    .reduce((sum, tx) => sum + tx.amount, 0)
})

const spendProgressPercent = computed(() => {
  const budget = budgetRecommendation.value?.remaining.value ?? 0
  if (budget <= 0) return 100
  return Math.min(100, Math.round((spentThisPeriod.value / budget) * 100))
})

const isOverBudget = computed(
  () => spentThisPeriod.value > (budgetRecommendation.value?.remaining.value ?? 0),
)

const recentTransactionsPreview = computed(() =>
  transactionsStore.recentTransactions.slice(0, RECENT_TRANSACTIONS_PREVIEW_COUNT),
)
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>Oversikt</h1>
    </div>

    <section v-if="plansStore.myPlans.length > 1" class="card">
      <label class="form-field">
        Plan
        <select
          :value="plansStore.activePlanId ?? ''"
          @change="plansStore.setActivePlan(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="plan in plansStore.myPlans" :key="plan.id" :value="plan.id">
            {{ plan.name }}{{ plan.type === 'individual' ? ' (individuell)' : '' }}
          </option>
        </select>
      </label>
    </section>

    <section v-if="!incomeStore.loaded" class="card">
      <p>Laster …</p>
    </section>

    <section v-else-if="!incomeStore.paySchedule" class="card">
      <h2>Sett opp lønningsdag</h2>
      <p class="card-subtitle">Vi bruker denne til å regne ut budsjettperioden din.</p>
      <PayScheduleForm v-if="currentPlan" :plan-id="currentPlan.id" />
    </section>

    <template v-else>
      <section v-if="currentPeriod" class="card pay-period-card">
        <p class="pay-period-info">
          Lønningsperiode: {{ formatShortDate(currentPeriod.start) }} –
          {{ formatShortDate(subDays(currentPeriod.end, 1)) }}
        </p>
        <p class="card-subtitle">{{ daysUntilPayday }} dager til neste lønning</p>
      </section>

      <section v-if="!incomePaymentsStore.loaded" class="card">
        <p>Laster …</p>
      </section>

      <section v-else-if="periodIncomeTotal === 0" class="card">
        <h2>Logg lønn for denne perioden</h2>
        <p class="card-subtitle">
          Så snart du har logget hva du fikk utbetalt, viser vi et anbefalt budsjett.
        </p>
        <LogIncomeForm v-if="currentPlan" :plan-id="currentPlan.id" />
      </section>

      <template v-else-if="budgetRecommendation">
        <section class="card">
          <h2>Anbefalt budsjett denne perioden</h2>
          <div class="budget-row budget-row-income">
            <span>Loggført lønn</span>
            <ExplainableValue :result="budgetRecommendation.income" />
          </div>

          <div v-if="budgetRecommendation.lineItems.length" class="budget-line-items">
            <div
              v-for="item in budgetRecommendation.lineItems"
              :key="item.recurringCostId"
              class="budget-row"
            >
              <span>{{ item.name }}</span>
              <ExplainableValue :result="item.estimate" />
            </div>
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
        </section>

        <section class="card">
          <h2>Brukt så langt denne perioden</h2>
          <div class="progress-track">
            <div
              class="progress-fill"
              :class="{ 'progress-fill-danger': isOverBudget }"
              :style="{ width: spendProgressPercent + '%' }"
            />
          </div>
          <p class="card-subtitle">
            {{ formatCurrencyNOK(spentThisPeriod) }} av
            {{ formatCurrencyNOK(budgetRecommendation.remaining.value) }} igjen etter faste utgifter
            (utenom det som allerede er dekket av faste utgifter)
          </p>
        </section>

        <section class="card">
          <h2>Logg mer lønn for denne perioden</h2>
          <LogIncomeForm v-if="currentPlan" :plan-id="currentPlan.id" />
        </section>

        <section class="card">
          <router-link to="/recurring-costs" class="button-primary card-link-button">
            Faste utgifter
          </router-link>
        </section>
      </template>
    </template>

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
.pay-period-info {
  font-weight: 600;
  margin: 0 0 var(--space-1);
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

.budget-line-items {
  display: flex;
  flex-direction: column;
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

.progress-track {
  margin-bottom: var(--space-2);
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
