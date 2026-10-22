<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLoadOnActivePlan } from '@/composables/useLoadOnActivePlan'
import { useSavingsStore } from '@/stores/savings.store'
import { usePlansStore } from '@/stores/plans.store'
import { useAuthStore } from '@/stores/auth.store'
import { useIncomeStore } from '@/stores/income.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useProfileNames } from '@/composables/useProfileNames'
import { useSavingsProgress } from '@/composables/useSavingsProgress'
import { calculateRequiredMonthlySavings } from '@/core/savings-calculator'
import { formatCurrencyNOK, todayLocalDate, formatMonthName, formatPlanLabel } from '@/core/format'
import { SAVINGS_THEMES } from '@/core/savings-themes'
import type { Database } from '@/types/database.types'
import ExplainableValue from '@/components/common/ExplainableValue.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PlanPicker from '@/components/budget/PlanPicker.vue'
import SavingsGoalForm from '@/components/savings/SavingsGoalForm.vue'

type SavingsGoal = Database['public']['Tables']['savings_goals']['Row']

const savingsStore = useSavingsStore()
const plansStore = usePlansStore()
const authStore = useAuthStore()
const incomeStore = useIncomeStore()

// The income store is only here for the plan's payday, which the streak
// behind the "på rad" badges counts pay periods by.
const { currentPlan } = useLoadOnActivePlan(async (planId) => {
  if (!authStore.user) return
  await Promise.all([savingsStore.load(planId), incomeStore.load(planId, authStore.user.id)])
})

const { achievements, withCelebrations } = useSavingsProgress()
const unlockedCount = computed(
  () => achievements.value.filter((achievement) => achievement.unlocked).length,
)

const { nameFor } = useProfileNames(() => {
  const ids = new Set<string>()
  for (const contributions of savingsStore.contributionsByGoal.values()) {
    for (const contribution of contributions) ids.add(contribution.created_by)
  }
  return [...ids]
})

function contributionsFor(goalId: string) {
  return savingsStore.contributionsByGoal.get(goalId) ?? []
}

// One sheet for both adding and editing: `editingGoal` is null while
// adding. It's kept apart from the open flag so the form stays in the
// sheet while it slides out, instead of vanishing the moment it closes.
const editingGoal = ref<SavingsGoal | null>(null)
const isGoalFormOpen = ref(false)

function openGoalForm() {
  editingGoal.value = null
  isGoalFormOpen.value = true
}

function startEditingGoal(goal: SavingsGoal) {
  editingGoal.value = goal
  isGoalFormOpen.value = true
}

// Set after adding a goal to another plan than the one on screen: it
// won't show up in this list, so without a word it'd seem to vanish.
const addedElsewhere = ref<{ goalName: string; planId: string; planLabel: string } | null>(null)

watch(
  () => currentPlan.value?.id,
  () => {
    addedElsewhere.value = null
  },
)

function handleGoalSaved(goal: SavingsGoal) {
  isGoalFormOpen.value = false
  if (editingGoal.value) return

  const plan = plansStore.myPlans.find((item) => item.id === goal.plan_id)
  addedElsewhere.value =
    !plan || plan.id === currentPlan.value?.id
      ? null
      : { goalName: goal.name, planId: plan.id, planLabel: formatPlanLabel(plan) }
}

function progressPercent(goalId: string, targetAmount: number): number {
  if (targetAmount <= 0) return 0
  return Math.min(100, Math.round((savingsStore.contributionsTotal(goalId) / targetAmount) * 100))
}

function requiredMonthlySavings(goal: { id: string; target_amount: number; target_date: string }) {
  return calculateRequiredMonthlySavings(
    {
      targetAmount: goal.target_amount,
      currentAmount: savingsStore.contributionsTotal(goal.id),
      targetDate: new Date(goal.target_date),
    },
    new Date(),
  )
}

const contributingGoalId = ref<string | null>(null)
const contributionAmount = ref<number | null>(null)
const contributionDate = ref(todayLocalDate())

const {
  loading: contributing,
  error: contributeError,
  run: runContribute,
} = useAsyncAction(async () => {
  if (!contributingGoalId.value || contributionAmount.value == null || !authStore.user) return
  const input = {
    goalId: contributingGoalId.value,
    amount: contributionAmount.value,
    occurredOn: contributionDate.value,
    createdBy: authStore.user.id,
  }
  await withCelebrations(() => savingsStore.addContribution(input), input.goalId)
  contributingGoalId.value = null
  contributionAmount.value = null
})

function startContributing(goalId: string) {
  contributingGoalId.value = goalId
  contributionAmount.value = null
  contributionDate.value = todayLocalDate()
}

async function handleDeleteGoal(goalId: string, goalName: string) {
  const confirmed = window.confirm(`Er du sikker på at du vil fjerne sparemålet "${goalName}"?`)
  if (!confirmed) return
  await savingsStore.deleteGoal(goalId)
}
</script>

<template>
  <div class="container">
    <div class="page-header page-header-with-action">
      <h1>Sparemål</h1>
      <button type="button" class="button-primary page-header-action" @click="openGoalForm">
        + Ny
      </button>
    </div>

    <PlanPicker v-if="plansStore.myPlans.length" />

    <section v-if="addedElsewhere" class="card savings-added-elsewhere">
      <p class="card-subtitle">
        «{{ addedElsewhere.goalName }}» ble lagt i {{ addedElsewhere.planLabel }}.
      </p>
      <button
        type="button"
        class="button-link"
        @click="plansStore.setActivePlan(addedElsewhere.planId)"
      >
        Vis
      </button>
    </section>

    <section v-if="!savingsStore.goals.length" class="card">
      <p class="card-subtitle">Ingen sparemål ennå. Legg inn det første med «Ny».</p>
    </section>

    <section v-for="goal in savingsStore.goals" :key="goal.id" class="card">
      <div class="savings-cover-actions">
        <button
          type="button"
          class="savings-cover-action"
          :aria-label="`Rediger sparemålet ${goal.name}`"
          @click="startEditingGoal(goal)"
        >
          ✎
        </button>
        <button
          type="button"
          class="savings-cover-action savings-cover-action-remove"
          :aria-label="`Fjern sparemålet ${goal.name}`"
          @click="handleDeleteGoal(goal.id, goal.name)"
        >
          ✕
        </button>
      </div>

      <div class="savings-cover" :style="{ background: SAVINGS_THEMES[goal.theme].gradient }">
        <span class="savings-cover-icon">{{ SAVINGS_THEMES[goal.theme].icon }}</span>
        <span v-if="progressPercent(goal.id, goal.target_amount) >= 100" class="savings-done-badge">
          🏆 Fullført
        </span>
      </div>

      <h2>{{ goal.name }}</h2>
      <p class="card-subtitle">Måldato: {{ goal.target_date }}</p>

      <div class="progress-track savings-progress-track">
        <div
          class="progress-fill"
          :style="{ width: progressPercent(goal.id, goal.target_amount) + '%' }"
        />
      </div>
      <p class="card-subtitle">
        {{ formatCurrencyNOK(savingsStore.contributionsTotal(goal.id)) }} av
        {{ formatCurrencyNOK(goal.target_amount) }}
      </p>

      <div class="budget-row">
        <span>Nødvendig sparing per måned</span>
        <ExplainableValue :result="requiredMonthlySavings(goal)" />
      </div>

      <template v-if="contributionsFor(goal.id).length">
        <p class="section-eyebrow savings-history-heading">Sparehistorikk</p>
        <ul class="savings-history-list">
          <li
            v-for="contribution in contributionsFor(goal.id)"
            :key="contribution.id"
            class="list-row-block"
          >
            <p class="savings-history-line">
              <strong>{{ nameFor(contribution.created_by) }}</strong> la til
              {{ formatCurrencyNOK(contribution.amount) }} ·
              {{ formatMonthName(new Date(contribution.occurred_on)) }}
            </p>
          </li>
        </ul>
      </template>

      <button
        v-if="contributingGoalId !== goal.id"
        type="button"
        class="button-primary savings-contribute-button"
        @click="startContributing(goal.id)"
      >
        Legg til sparing
      </button>

      <form v-else class="form savings-contribute-form" @submit.prevent="runContribute()">
        <label class="form-field">
          Beløp (kr)
          <input
            v-model.number="contributionAmount"
            type="number"
            min="0"
            step="1"
            required
            autofocus
          />
        </label>
        <label class="form-field">
          Dato
          <input v-model="contributionDate" type="date" required />
        </label>
        <p v-if="contributeError" class="form-error">{{ contributeError }}</p>
        <button type="submit" class="button-primary" :disabled="contributing">
          {{ contributing ? 'Lagrer …' : 'Lagre' }}
        </button>
      </form>
    </section>

    <section class="card">
      <div class="savings-badges-header">
        <h2>Merker</h2>
        <span class="card-subtitle">{{ unlockedCount }} av {{ achievements.length }}</span>
      </div>
      <ul class="savings-badges">
        <li
          v-for="achievement in achievements"
          :key="achievement.id"
          class="savings-badge"
          :class="{ 'savings-badge-locked': !achievement.unlocked }"
        >
          <span class="savings-badge-icon" aria-hidden="true">{{ achievement.icon }}</span>
          <span class="savings-badge-title">{{ achievement.title }}</span>
          <span class="savings-badge-description">{{ achievement.description }}</span>
          <span class="visually-hidden">{{
            achievement.unlocked ? 'Låst opp' : 'Ikke låst opp ennå'
          }}</span>
        </li>
      </ul>
    </section>

    <BaseModal v-model="isGoalFormOpen" :title="editingGoal ? 'Rediger sparemål' : 'Nytt sparemål'">
      <SavingsGoalForm
        :key="editingGoal?.id ?? 'new'"
        :goal="editingGoal"
        @saved="handleGoalSaved"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.savings-added-elsewhere {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.savings-added-elsewhere p {
  margin: 0;
}

.savings-cover {
  position: relative;
  margin: calc(var(--space-4) * -1) calc(var(--space-4) * -1) var(--space-4);
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Same frosted backing as the cover's action buttons, so it reads on
   every theme's gradient. */
.savings-done-badge {
  position: absolute;
  left: var(--space-3);
  bottom: var(--space-2);
  padding: 2px var(--space-2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: var(--color-text);
  font-size: 0.75rem;
  font-weight: 700;
}

.savings-badges-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.savings-badges {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: 0;
}

@media (min-width: 640px) {
  .savings-badges {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.savings-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-3) var(--space-2);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-strong);
  text-align: center;
}

.savings-badge-icon {
  font-size: 1.8rem;
  line-height: 1.2;
}

.savings-badge-title {
  font-weight: 700;
  font-size: 0.9rem;
}

.savings-badge-description {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Still readable, so it shows what there is to aim for -- just clearly
   not earned yet. */
.savings-badge-locked {
  background: transparent;
  opacity: 0.55;
}

.savings-badge-locked .savings-badge-icon {
  filter: grayscale(1);
}

.savings-cover-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.savings-progress-track {
  margin-bottom: var(--space-2);
}

.savings-history-heading {
  margin: var(--space-3) 0 var(--space-1);
}

.savings-history-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.savings-history-line {
  margin: 0;
  font-size: 0.9rem;
}

.savings-contribute-button {
  width: 100%;
  margin-top: var(--space-2);
}

.savings-contribute-form {
  margin-top: var(--space-3);
}

.savings-cover-actions {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 1;
  display: flex;
  gap: var(--space-2);
}

/* Sits on the cover art, so it gets its own frosted backing to stay
   legible on every theme's gradient, light or dark. */
.savings-cover-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1;
}

.savings-cover-action:hover {
  color: var(--color-primary);
}

.savings-cover-action-remove:hover {
  color: var(--color-danger);
}
</style>
