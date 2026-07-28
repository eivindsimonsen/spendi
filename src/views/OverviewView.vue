<script setup lang="ts">
import { computed, watch } from 'vue'
import { subMonths, subDays, format } from 'date-fns'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { usePlansStore } from '@/stores/plans.store'
import { useIncomeStore } from '@/stores/income.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useSavingsStore } from '@/stores/savings.store'
import { useBudgetRecommendation } from '@/composables/useBudgetRecommendation'
import { sumByMonth } from '@/core/transaction-stats'
import { SAVINGS_THEMES } from '@/core/savings-themes'
import type { SavingsGoalTheme } from '@/types/database.types'
import { formatCurrencyNOK } from '@/core/format'
import ExplainableValue from '@/components/common/ExplainableValue.vue'
import PlanPicker from '@/components/budget/PlanPicker.vue'

const TREND_MONTHS = 6

const { currentPlan } = useCurrentPlan()
const plansStore = usePlansStore()
const incomeStore = useIncomeStore()
const transactionsStore = useTransactionsStore()
const savingsStore = useSavingsStore()

const { currentPeriod, daysUntilPayday, periodIncomeTotal, budgetRecommendation } = useBudgetRecommendation()

watch(
  currentPlan,
  async (plan) => {
    if (!plan) return
    await savingsStore.load(plan.id)
  },
  { immediate: true },
)

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

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
    <div class="overview-header">
      <div class="page-header">
        <h1>Oversikt</h1>
      </div>
      <router-link
        to="/settings"
        class="settings-gear"
        :aria-label="!incomeStore.paySchedule ? 'Innstillinger (lønningsdag mangler)' : 'Innstillinger'"
      >
        <span aria-hidden="true">⚙️</span>
        <span v-if="!incomeStore.paySchedule" class="settings-gear-dot" aria-hidden="true" />
      </router-link>
    </div>

    <PlanPicker v-if="plansStore.myPlans.length" />

    <section v-if="!incomeStore.loaded" class="card">
      <p>Laster …</p>
    </section>

    <section v-else-if="!incomeStore.paySchedule" class="card income-hero">
      <p class="income-hero-warning">⚠️ Du har ikke satt lønningsdag ennå.</p>
      <p class="card-subtitle">Trykk på tannhjulet ⚙️ oppe til høyre for å legge den til.</p>
      <router-link to="/settings" class="button-primary card-link-button">Åpne innstillinger</router-link>
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
          <router-link to="/budget" class="card-header-link">
            <h2>Budsjett</h2>
            <span class="card-header-arrow" aria-hidden="true">›</span>
          </router-link>
          <div class="budget-row budget-row-income">
            <span>Loggført lønn</span>
            <ExplainableValue :result="budgetRecommendation.income" />
          </div>
          <div class="budget-row">
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
          <router-link to="/recurring-costs" class="button-primary card-link-button">
            Faste utgifter
          </router-link>
        </section>
      </template>

      <section v-if="savingsStore.goals.length" class="card">
        <router-link to="/savings" class="card-header-link">
          <h2>Spareplaner</h2>
          <span class="card-header-arrow" aria-hidden="true">›</span>
        </router-link>
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
      </section>
    </template>

    <router-link to="/statistics" class="card trend-card">
      <div class="card-header-link">
        <h2>Utvikling siste {{ TREND_MONTHS }} måneder</h2>
        <span class="card-header-arrow" aria-hidden="true">›</span>
      </div>
      <div class="trend-chart">
        <div v-for="entry in trendMonths" :key="entry.month" class="trend-bar-col">
          <div class="trend-bar-track">
            <div class="trend-bar-fill" :style="{ height: trendBarHeight(entry.total) + '%' }" />
          </div>
          <span class="trend-bar-label">{{ trendMonthLabel(entry.month) }}</span>
        </div>
      </div>
    </router-link>
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

.overview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.overview-header .page-header {
  margin-bottom: 0;
}

.settings-gear {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  font-size: 1.2rem;
  text-decoration: none;
  transition: transform 0.15s ease;
}

.settings-gear:active {
  transform: scale(0.94);
}

.settings-gear-dot {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--color-danger);
  border: 2px solid var(--color-background);
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

.trend-card {
  display: block;
  color: inherit;
  text-decoration: none;
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

</style>
