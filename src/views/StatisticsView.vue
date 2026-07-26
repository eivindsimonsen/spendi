<script setup lang="ts">
import { computed, watch } from 'vue'
import { format, subMonths, startOfMonth, addDays } from 'date-fns'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { useCategoriesStore } from '@/stores/categories.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useSavingsStore } from '@/stores/savings.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import { topCategories, monthOverMonthChange } from '@/core/transaction-stats'
import { summarizeMonthlyIncomeExpense, calculateSavingsRate } from '@/core/income-expense-stats'
import { formatCurrencyNOK } from '@/core/format'

const TREND_MONTHS = 6
const TOP_CATEGORIES_COUNT = 5

const { currentPlan } = useCurrentPlan()
const categoriesStore = useCategoriesStore()
const transactionsStore = useTransactionsStore()
const incomePaymentsStore = useIncomePaymentsStore()
const savingsStore = useSavingsStore()
const { categoryLabel } = useCategoryLabel()

watch(
  currentPlan,
  async (plan) => {
    if (!plan) return
    const sinceDate = format(startOfMonth(subMonths(new Date(), TREND_MONTHS)), 'yyyy-MM-dd')
    // Exclusive upper bound on the income-history query, so today's payments
    // are still included (matches how a pay period's end date works).
    const untilDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    await Promise.all([
      categoriesStore.load(plan.id),
      transactionsStore.loadSince(plan.id, sinceDate),
      incomePaymentsStore.loadHistory(plan.id, sinceDate, untilDate),
      savingsStore.load(plan.id),
    ])
  },
  { immediate: true },
)

// Zero-filled, chronological month keys for the whole window, so a month
// with no activity still shows up as an honest zero rather than a gap.
const months = computed(() => {
  const list: string[] = []
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    list.push(format(subMonths(new Date(), i), 'yyyy-MM'))
  }
  return list
})

const monthlyIncomeExpense = computed(() =>
  summarizeMonthlyIncomeExpense(
    months.value,
    incomePaymentsStore.historyPayments.map((payment) => ({
      amount: payment.amount,
      occurredOn: payment.received_on,
    })),
    transactionsStore.recentTransactions.map((tx) => ({
      amount: tx.amount,
      occurredOn: tx.occurred_on,
    })),
  ),
)

const monthlySpendTotals = computed(() =>
  monthlyIncomeExpense.value.map((entry) => ({ month: entry.month, total: entry.expense })),
)

const totalSpent = computed(() => monthlySpendTotals.value.reduce((sum, entry) => sum + entry.total, 0))
const averagePerMonth = computed(() => totalSpent.value / TREND_MONTHS)
const momChange = computed(() => monthOverMonthChange(monthlySpendTotals.value))

const momChangeDirection = computed<'up' | 'down' | 'flat'>(() => {
  const pct = momChange.value.changePercentage
  if (!pct) return 'flat'
  return pct > 0 ? 'up' : 'down'
})

const trendMax = computed(() => Math.max(1, ...monthlySpendTotals.value.map((entry) => entry.total)))

function trendBarHeight(total: number): number {
  return Math.round((total / trendMax.value) * 100)
}

function trendMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-')
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('nb-NO', {
    month: 'short',
  })
}

const totalIncome = computed(() => monthlyIncomeExpense.value.reduce((sum, entry) => sum + entry.income, 0))
const totalNet = computed(() => monthlyIncomeExpense.value.reduce((sum, entry) => sum + entry.net, 0))
const savingsRate = computed(() => calculateSavingsRate(monthlyIncomeExpense.value))

const topCats = computed(() =>
  topCategories(
    transactionsStore.recentTransactions.map((tx) => ({
      categoryId: tx.category_id,
      amount: tx.amount,
      occurredOn: tx.occurred_on,
    })),
    TOP_CATEGORIES_COUNT,
  ),
)

const windowStartDate = computed(() =>
  format(startOfMonth(subMonths(new Date(), TREND_MONTHS)), 'yyyy-MM-dd'),
)

// Only goals with actual contributions in the window are worth surfacing
// here -- an untouched goal isn't part of "what did we save lately".
const goalContributionsInWindow = computed(() => {
  const rows: { goalId: string; goalName: string; amount: number }[] = []
  for (const goal of savingsStore.goals) {
    const contributions = savingsStore.contributionsByGoal.get(goal.id) ?? []
    const total = contributions
      .filter((contribution) => contribution.occurred_on >= windowStartDate.value)
      .reduce((sum, contribution) => sum + contribution.amount, 0)
    if (total > 0) rows.push({ goalId: goal.id, goalName: goal.name, amount: total })
  }
  return rows.sort((a, b) => b.amount - a.amount)
})

const totalSavedToGoals = computed(() =>
  goalContributionsInWindow.value.reduce((sum, goal) => sum + goal.amount, 0),
)

const transactionCount = computed(() => transactionsStore.recentTransactions.length)

const averageTransactionAmount = computed(() =>
  transactionCount.value === 0 ? 0 : totalSpent.value / transactionCount.value,
)

const biggestExpense = computed(() => {
  if (!transactionsStore.recentTransactions.length) return null
  return [...transactionsStore.recentTransactions].sort((a, b) => b.amount - a.amount)[0]!
})

function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="container">
    <router-link to="/" class="button-link back-link">← Tilbake til oversikt</router-link>

    <div class="page-header">
      <h1>Statistikk</h1>
      <p class="card-subtitle">Siste {{ TREND_MONTHS }} måneder</p>
    </div>

    <section class="card">
      <h2>Totalt brukt</h2>
      <p class="stat-hero-amount">{{ formatCurrencyNOK(totalSpent) }}</p>
      <p class="card-subtitle">I snitt {{ formatCurrencyNOK(averagePerMonth) }} per måned</p>
      <p v-if="momChange.changePercentage !== null" class="stat-change" :class="`stat-change-${momChangeDirection}`">
        <span aria-hidden="true">{{
          momChangeDirection === 'up' ? '▲' : momChangeDirection === 'down' ? '▼' : '–'
        }}</span>
        {{ Math.abs(momChange.changePercentage) }} % fra forrige måned
      </p>
      <p v-else class="card-subtitle">Ingen tall fra forrige måned å sammenligne med ennå.</p>
    </section>

    <section class="card">
      <h2>Utvikling per måned</h2>
      <div class="trend-chart">
        <div v-for="entry in monthlySpendTotals" :key="entry.month" class="trend-bar-col">
          <span class="trend-bar-amount">{{ formatCurrencyNOK(entry.total) }}</span>
          <div class="trend-bar-track">
            <div class="trend-bar-fill" :style="{ height: trendBarHeight(entry.total) + '%' }" />
          </div>
          <span class="trend-bar-label">{{ trendMonthLabel(entry.month) }}</span>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Inntekt vs. forbruk</h2>
      <div class="income-expense-header">
        <span></span>
        <span>Inntekt</span>
        <span>Forbruk</span>
        <span>Netto</span>
      </div>
      <div class="income-expense-list">
        <div v-for="entry in monthlyIncomeExpense" :key="entry.month" class="income-expense-row">
          <span class="income-expense-month">{{ trendMonthLabel(entry.month) }}</span>
          <span class="income-expense-income">{{ formatCurrencyNOK(entry.income) }}</span>
          <span class="income-expense-expense">{{ formatCurrencyNOK(entry.expense) }}</span>
          <span :class="entry.net >= 0 ? 'income-expense-net-positive' : 'income-expense-net-negative'">
            {{ formatCurrencyNOK(entry.net) }}
          </span>
        </div>
      </div>
      <p class="card-subtitle income-expense-summary">
        <template v-if="savingsRate !== null">
          Dere har satt til side {{ savingsRate }} % av inntekten de siste {{ TREND_MONTHS }} månedene ({{
            formatCurrencyNOK(totalNet)
          }}
          av {{ formatCurrencyNOK(totalIncome) }}).
        </template>
        <template v-else>Ingen lønn registrert i denne perioden ennå.</template>
      </p>
    </section>

    <section v-if="topCats.length" class="card">
      <h2>Topp kategorier</h2>
      <div v-for="category in topCats" :key="category.categoryId" class="stat-bar-row">
        <span class="stat-bar-label">{{ categoryLabel(category.categoryId) }}</span>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: category.percentage + '%' }" />
        </div>
        <span class="stat-bar-value">{{ formatCurrencyNOK(category.total) }} ({{ category.percentage }} %)</span>
      </div>
    </section>

    <section v-if="goalContributionsInWindow.length" class="card">
      <h2>Spart til spareplaner</h2>
      <p class="stat-hero-amount stat-hero-amount-small">{{ formatCurrencyNOK(totalSavedToGoals) }}</p>
      <div v-for="goal in goalContributionsInWindow" :key="goal.goalId" class="stat-row">
        <span>{{ goal.goalName }}</span>
        <span>{{ formatCurrencyNOK(goal.amount) }}</span>
      </div>
      <router-link to="/savings" class="account-link savings-preview-link">Se spareplaner →</router-link>
    </section>

    <section v-if="transactionCount" class="card">
      <h2>Nøkkeltall</h2>
      <div class="stat-row">
        <span>Antall utgifter registrert</span>
        <span>{{ transactionCount }}</span>
      </div>
      <div class="stat-row">
        <span>Snitt per utgift</span>
        <span>{{ formatCurrencyNOK(averageTransactionAmount) }}</span>
      </div>
      <div v-if="biggestExpense" class="stat-row">
        <span>Største enkeltutgift</span>
        <span class="stat-row-detail">
          {{ formatCurrencyNOK(biggestExpense.amount) }}
          <span class="stat-row-hint">
            {{ categoryLabel(biggestExpense.category_id) }} ·
            {{ formatShortDate(biggestExpense.occurred_on) }}
          </span>
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: var(--space-4);
}

.stat-hero-amount {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 var(--space-1);
}

.stat-hero-amount-small {
  font-size: 1.5rem;
}

.stat-change {
  margin: var(--space-2) 0 0;
  font-weight: 600;
  font-size: 0.9rem;
}

.stat-change-up {
  color: var(--color-danger);
}

.stat-change-down {
  color: var(--color-success);
}

.stat-change-flat {
  color: var(--color-text-muted);
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  height: 160px;
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

.trend-bar-amount {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  white-space: nowrap;
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

.income-expense-header,
.income-expense-row {
  display: grid;
  grid-template-columns: 44px 1fr 1fr 1fr;
  gap: var(--space-2);
  align-items: center;
  text-align: right;
}

.income-expense-header {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-subtle);
  padding-bottom: var(--space-1);
}

.income-expense-header span:first-child,
.income-expense-month {
  text-align: left;
}

.income-expense-row {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.income-expense-row:first-child {
  border-top: none;
}

.income-expense-income {
  color: var(--color-success);
}

.income-expense-expense {
  color: var(--color-danger);
}

.income-expense-net-positive {
  font-weight: 700;
  color: var(--color-success);
}

.income-expense-net-negative {
  font-weight: 700;
  color: var(--color-danger);
}

.income-expense-summary {
  margin-top: var(--space-3);
}

.stat-bar-row {
  display: grid;
  grid-template-columns: 110px 1fr auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  font-size: 0.9rem;
}

.stat-bar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-bar-value {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-border);
}

.stat-row:first-of-type {
  border-top: none;
}

.stat-row-detail {
  text-align: right;
}

.stat-row-hint {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-subtle);
}

.savings-preview-link {
  display: block;
  margin-top: var(--space-2);
}
</style>
