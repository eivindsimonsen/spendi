<script setup lang="ts">
import { computed } from 'vue'
import { subDays } from 'date-fns'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { usePlansStore } from '@/stores/plans.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import { useBudgetRecommendation } from '@/composables/useBudgetRecommendation'
import { usePeriodHistory } from '@/composables/usePeriodHistory'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { BUDGET_MODELS, DEFAULT_BUDGET_MODEL, type BudgetModelId } from '@/core/discretionary-split'
import type { PayPeriod } from '@/core/pay-schedule'
import { formatCurrencyNOK, formatShortDate } from '@/core/format'
import ExplainableValue from '@/components/common/ExplainableValue.vue'
import SwipeAction from '@/components/common/SwipeAction.vue'

// A fixed/manual cost or a variable cost with no history yet just
// restates the number you set yourself -- nothing to explain there. Only
// a real rolling-average calculation is worth an info icon.
function hasCalculation(estimateModel: string): boolean {
  return estimateModel === 'variable-cost-rolling-average-v1'
}

const { currentPlan } = useCurrentPlan()
const plansStore = usePlansStore()
const transactionsStore = useTransactionsStore()
const { categoryLabel } = useCategoryLabel()
const { periodSummaries } = usePeriodHistory(currentPlan)

function formatPeriodRange(period: PayPeriod): string {
  return `${formatShortDate(period.start)} – ${formatShortDate(subDays(period.end, 1))}`
}

const {
  budgetRecommendation,
  sortedLineItems,
  discretionaryTransactionsThisPeriod,
  memberName,
  recurringCostOwnerName,
  categoryIcon,
  toggleRecurringCostSkip,
} = useBudgetRecommendation(currentPlan)

// Grouped by who's responsible for each cost, so a shared plan's list
// shows each person's name once instead of repeating it under every
// single row -- order follows sortedLineItems, so whoever owns the
// single biggest cost ends up as the first group.
const lineItemsByOwner = computed(() => {
  const groups = new Map<string, typeof sortedLineItems.value>()
  for (const item of sortedLineItems.value) {
    const owner = recurringCostOwnerName(item.recurringCostId)
    const existing = groups.get(owner)
    if (existing) existing.push(item)
    else groups.set(owner, [item])
  }
  return [...groups.entries()].map(([ownerName, items]) => ({ ownerName, items }))
})

const budgetModelList = Object.values(BUDGET_MODELS)

const selectedModelId = computed<BudgetModelId>(
  () => currentPlan.value?.budget_model ?? DEFAULT_BUDGET_MODEL,
)

const {
  loading: savingModel,
  error: saveModelError,
  run: runSelectModel,
} = useAsyncAction(async (modelId: BudgetModelId) => {
  if (!currentPlan.value || currentPlan.value.budget_model === modelId) return
  await plansStore.updateBudgetModel(currentPlan.value.id, modelId)
})

async function handleDeleteTransaction(id: string) {
  const confirmed = window.confirm('Er du sikker på at du vil fjerne denne utgiften?')
  if (!confirmed) return
  await transactionsStore.remove(id)
}
</script>

<template>
  <div class="container">
    <router-link to="/" class="button-link back-link">← Tilbake til oversikt</router-link>

    <div class="page-header">
      <h1>Budsjett</h1>
    </div>

    <section v-if="!budgetRecommendation" class="card">
      <p class="card-subtitle">
        Ingen lønn er logget for denne perioden ennå.
        <router-link to="/income">Logg lønn</router-link> for å se et anbefalt budsjett.
      </p>
    </section>

    <template v-else>
      <section class="card">
        <h2>Anbefalt budsjett denne perioden</h2>
        <div class="budget-row budget-row-income">
          <span>Loggført lønn</span>
          <ExplainableValue :result="budgetRecommendation.income" />
        </div>

        <p class="section-eyebrow budget-section-heading">Faste utgifter</p>
        <p v-if="sortedLineItems.length" class="card-subtitle budget-swipe-hint">
          💡 Dra en utgift mot venstre for å hoppe over den denne perioden.
        </p>
        <template v-if="sortedLineItems.length">
          <template v-if="currentPlan?.type === 'shared'">
            <div
              v-for="group in lineItemsByOwner"
              :key="group.ownerName"
              class="budget-owner-group"
            >
              <p class="budget-owner-heading">{{ group.ownerName }}</p>
              <div class="budget-line-items">
                <SwipeAction
                  v-for="item in group.items"
                  :key="item.recurringCostId"
                  :label="item.skipped ? 'Ta med igjen' : 'Hopp over'"
                  @action="toggleRecurringCostSkip(item.recurringCostId)"
                >
                  <div class="budget-row" :class="{ 'budget-row-skipped': item.skipped }">
                    <span>{{ categoryIcon(item.categoryId) }} {{ item.name }}</span>
                    <ExplainableValue
                      v-if="hasCalculation(item.estimate.model)"
                      :result="item.estimate"
                    />
                    <span v-else>{{ formatCurrencyNOK(item.estimate.value) }}</span>
                  </div>
                </SwipeAction>
              </div>
            </div>
          </template>
          <div v-else class="budget-line-items">
            <SwipeAction
              v-for="item in sortedLineItems"
              :key="item.recurringCostId"
              :label="item.skipped ? 'Ta med igjen' : 'Hopp over'"
              @action="toggleRecurringCostSkip(item.recurringCostId)"
            >
              <div class="budget-row" :class="{ 'budget-row-skipped': item.skipped }">
                <span>{{ categoryIcon(item.categoryId) }} {{ item.name }}</span>
                <ExplainableValue
                  v-if="hasCalculation(item.estimate.model)"
                  :result="item.estimate"
                />
                <span v-else>{{ formatCurrencyNOK(item.estimate.value) }}</span>
              </div>
            </SwipeAction>
          </div>
        </template>
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
          <p class="section-eyebrow budget-section-heading budget-section-heading-divided">
            Uforutsett utgift
          </p>
          <div class="budget-line-items">
            <div v-for="tx in discretionaryTransactionsThisPeriod" :key="tx.id" class="budget-row">
              <span>
                {{ categoryLabel(tx.category_id) }}
                <span v-if="currentPlan?.type === 'shared'" class="budget-row-owner">
                  {{ memberName(tx.paid_by) }}
                </span>
              </span>
              <span class="budget-row-amount-actions">
                <span>{{ formatCurrencyNOK(tx.amount) }}</span>
                <button
                  type="button"
                  class="icon-button-remove"
                  aria-label="Fjern utgift"
                  @click="handleDeleteTransaction(tx.id)"
                >
                  ✕
                </button>
              </span>
            </div>
          </div>
        </template>
      </section>

      <section v-if="periodSummaries.length" class="card">
        <h2>Tidligere perioder</h2>
        <div class="summary-grid-header period-history-columns">
          <span></span>
          <span>Inntekt</span>
          <span>Brukt</span>
          <span>Spart</span>
        </div>
        <div class="period-history-list">
          <div
            v-for="summary in periodSummaries"
            :key="summary.period.start.toISOString()"
            class="summary-grid-row period-history-columns"
          >
            <span class="summary-grid-row-label">{{ formatPeriodRange(summary.period) }}</span>
            <span class="period-history-income">{{ formatCurrencyNOK(summary.income) }}</span>
            <span class="period-history-spent">{{ formatCurrencyNOK(summary.spent) }}</span>
            <span class="period-history-saved">{{ formatCurrencyNOK(summary.saved) }}</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Budsjettmodell</h2>
        <p class="card-subtitle">
          Velg hvilken fordeling "Fri bruk / Sparing / Uforutsett" skal følge.
        </p>
        <div class="budget-model-list">
          <button
            v-for="model in budgetModelList"
            :key="model.id"
            type="button"
            class="budget-model-option"
            :class="{ 'budget-model-option-active': model.id === selectedModelId }"
            :disabled="savingModel"
            @click="runSelectModel(model.id)"
          >
            <span class="budget-model-option-header">
              <strong>{{ model.label }}</strong>
              <span
                v-if="model.id === selectedModelId"
                class="budget-model-option-check"
                aria-hidden="true"
                >✓</span
              >
            </span>
            <span class="card-subtitle">{{ model.description }}</span>
          </button>
        </div>
        <p v-if="saveModelError" class="form-error">{{ saveModelError }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.budget-section-heading {
  margin: 0 0 var(--space-1);
}

.budget-swipe-hint {
  font-size: 0.8rem;
  margin: 0 0 var(--space-2);
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

.budget-owner-group {
  margin-bottom: var(--space-3);
}

.budget-owner-group:last-of-type {
  margin-bottom: 0;
}

.budget-owner-heading {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-1);
}

.budget-row-amount-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.budget-row-skipped {
  opacity: 0.55;
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

.period-history-columns {
  grid-template-columns: 88px 1fr 1fr 1fr;
}

.period-history-income {
  color: var(--color-success);
}

.period-history-spent {
  color: var(--color-danger);
}

.period-history-saved {
  font-weight: 700;
}

.budget-model-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.budget-model-option {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.budget-model-option:disabled {
  opacity: 0.7;
}

.budget-model-option-active {
  border-color: var(--color-primary);
  background: var(--glass-bg-strong);
}

.budget-model-option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.budget-model-option-check {
  color: var(--color-primary);
  font-weight: 700;
}
</style>
