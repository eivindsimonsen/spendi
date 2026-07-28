<script setup lang="ts">
import { ref, computed } from 'vue'
import { subDays } from 'date-fns'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { usePlansStore } from '@/stores/plans.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import { useBudgetRecommendation } from '@/composables/useBudgetRecommendation'
import { usePeriodHistory } from '@/composables/usePeriodHistory'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { BUDGET_MODELS, DEFAULT_BUDGET_MODEL, type BudgetModelId } from '@/core/discretionary-split'
import { calculateDailyAllowance, classifyDailyAllowance } from '@/core/daily-allowance'
import type { PayPeriod } from '@/core/pay-schedule'
import { formatCurrencyNOK } from '@/core/format'
import ExplainableValue from '@/components/common/ExplainableValue.vue'

const { currentPlan } = useCurrentPlan()
const plansStore = usePlansStore()
const transactionsStore = useTransactionsStore()
const { categoryLabel } = useCategoryLabel()
const { periodSummaries } = usePeriodHistory()

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

function formatPeriodRange(period: PayPeriod): string {
  return `${formatShortDate(period.start)} – ${formatShortDate(subDays(period.end, 1))}`
}

const {
  currentPeriod,
  daysUntilPayday,
  budgetRecommendation,
  sortedLineItems,
  discretionaryTransactionsThisPeriod,
  memberName,
  recurringCostOwnerName,
  categoryIcon,
  toggleRecurringCostSkip,
} = useBudgetRecommendation()

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
  () => (currentPlan.value?.budget_model as BudgetModelId | undefined) ?? DEFAULT_BUDGET_MODEL,
)

const {
  loading: savingModel,
  error: saveModelError,
  run: runSelectModel,
} = useAsyncAction(async (modelId: BudgetModelId) => {
  if (!currentPlan.value || currentPlan.value.budget_model === modelId) return
  await plansStore.updateBudgetModel(currentPlan.value.id, modelId)
})

const dailyAmountInput = ref<number | null>(null)

const dailyAllowance = computed(() => {
  if (dailyAmountInput.value == null || daysUntilPayday.value == null) return null
  return calculateDailyAllowance(dailyAmountInput.value, daysUntilPayday.value)
})

// The recommended "Fri bruk" rate spread evenly across the whole period,
// used as the baseline for judging whether the entered amount is
// comfortable or tight -- ties the feedback to this couple's own budget
// rather than an arbitrary fixed kr figure.
const recommendedDailyRate = computed(() => {
  if (!budgetRecommendation.value || !currentPeriod.value) return null
  const periodLengthDays = Math.round(
    (currentPeriod.value.end.getTime() - currentPeriod.value.start.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (periodLengthDays <= 0) return null
  return budgetRecommendation.value.split.fun.value / periodLengthDays
})

const dailyAllowanceFeedback = computed(() => {
  if (!dailyAllowance.value) return null
  return classifyDailyAllowance(dailyAllowance.value.value, recommendedDailyRate.value)
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

        <p class="budget-section-heading">Faste utgifter</p>
        <template v-if="sortedLineItems.length">
          <template v-if="currentPlan?.type === 'shared'">
            <div v-for="group in lineItemsByOwner" :key="group.ownerName" class="budget-owner-group">
              <p class="budget-owner-heading">{{ group.ownerName }}</p>
              <div class="budget-line-items">
                <div
                  v-for="item in group.items"
                  :key="item.recurringCostId"
                  class="budget-row"
                  :class="{ 'budget-row-skipped': item.skipped }"
                >
                  <span>{{ categoryIcon(item.categoryId) }} {{ item.name }}</span>
                  <span class="budget-row-amount-actions">
                    <ExplainableValue :result="item.estimate" />
                    <button
                      type="button"
                      class="budget-row-skip-toggle"
                      @click="toggleRecurringCostSkip(item.recurringCostId)"
                    >
                      {{ item.skipped ? 'Ta med igjen' : 'Hopp over' }}
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="budget-line-items">
            <div
              v-for="item in sortedLineItems"
              :key="item.recurringCostId"
              class="budget-row"
              :class="{ 'budget-row-skipped': item.skipped }"
            >
              <span>{{ categoryIcon(item.categoryId) }} {{ item.name }}</span>
              <span class="budget-row-amount-actions">
                <ExplainableValue :result="item.estimate" />
                <button
                  type="button"
                  class="budget-row-skip-toggle"
                  @click="toggleRecurringCostSkip(item.recurringCostId)"
                >
                  {{ item.skipped ? 'Ta med igjen' : 'Hopp over' }}
                </button>
              </span>
            </div>
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
          <p class="budget-section-heading budget-section-heading-divided">Uforutsett utgift</p>
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
                  class="budget-row-remove"
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
        <div class="period-history-header">
          <span></span>
          <span>Inntekt</span>
          <span>Brukt</span>
          <span>Spart</span>
        </div>
        <div class="period-history-list">
          <div v-for="summary in periodSummaries" :key="summary.period.start.toISOString()" class="period-history-row">
            <span class="period-history-range">{{ formatPeriodRange(summary.period) }}</span>
            <span class="period-history-income">{{ formatCurrencyNOK(summary.income) }}</span>
            <span class="period-history-spent">{{ formatCurrencyNOK(summary.spent) }}</span>
            <span class="period-history-saved">{{ formatCurrencyNOK(summary.saved) }}</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Budsjettmodell</h2>
        <p class="card-subtitle">Velg hvilken fordeling "Fri bruk / Sparing / Uforutsett" skal følge.</p>
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
              <span v-if="model.id === selectedModelId" class="budget-model-option-check" aria-hidden="true"
                >✓</span
              >
            </span>
            <span class="card-subtitle">{{ model.description }}</span>
          </button>
        </div>
        <p v-if="saveModelError" class="form-error">{{ saveModelError }}</p>
      </section>

      <section class="card">
        <h2>Hva har jeg igjen per dag?</h2>
        <p class="card-subtitle">
          Skriv inn hvor mye du har igjen nå, så deler vi det på dagene som gjenstår til lønn.
        </p>
        <label class="form-field daily-allowance-field">
          Beløp (kr)
          <input
            v-model.number="dailyAmountInput"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            placeholder="F.eks. 1000"
          />
        </label>
        <div v-if="dailyAllowance" class="daily-allowance-result">
          <div class="budget-row">
            <span>Til rådighet per dag</span>
            <ExplainableValue :result="dailyAllowance" />
          </div>
          <p
            v-if="dailyAllowanceFeedback"
            class="daily-allowance-feedback"
            :class="`daily-allowance-feedback-${dailyAllowanceFeedback.level}`"
          >
            {{ dailyAllowanceFeedback.message }}
          </p>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: var(--space-4);
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

.budget-row-remove {
  background: none;
  border: none;
  color: var(--color-text-subtle);
  font-size: 0.9rem;
  line-height: 1;
  padding: var(--space-1);
}

.budget-row-remove:hover {
  color: var(--color-danger);
}

.budget-row-skipped {
  opacity: 0.55;
}

.budget-row-skip-toggle {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  padding: 0;
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

.period-history-header,
.period-history-row {
  display: grid;
  grid-template-columns: 88px 1fr 1fr 1fr;
  gap: var(--space-2);
  align-items: center;
  text-align: right;
}

.period-history-header {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-subtle);
  padding-bottom: var(--space-1);
}

.period-history-header span:first-child,
.period-history-range {
  text-align: left;
}

.period-history-row {
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.period-history-row:first-child {
  border-top: none;
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

.daily-allowance-field {
  margin-top: var(--space-3);
}

.daily-allowance-result {
  margin-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-2);
}

.daily-allowance-feedback {
  margin: var(--space-1) 0 0;
  font-weight: 600;
  font-size: 0.9rem;
}

.daily-allowance-feedback-comfortable {
  color: var(--color-success);
}

.daily-allowance-feedback-moderate {
  color: var(--color-warning);
}

.daily-allowance-feedback-tight {
  color: var(--color-danger);
}

.daily-allowance-feedback-unknown {
  color: var(--color-text-muted);
}
</style>
