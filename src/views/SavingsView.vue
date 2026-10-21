<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLoadOnActivePlan } from '@/composables/useLoadOnActivePlan'
import { useSavingsStore } from '@/stores/savings.store'
import { usePlansStore } from '@/stores/plans.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useProfileNames } from '@/composables/useProfileNames'
import { useAddFromQuery } from '@/composables/useAddFromQuery'
import { calculateRequiredMonthlySavings } from '@/core/savings-calculator'
import { formatCurrencyNOK, todayLocalDate, formatMonthName } from '@/core/format'
import { SAVINGS_THEMES } from '@/core/savings-themes'
import type { Database, SavingsGoalTheme } from '@/types/database.types'
import ExplainableValue from '@/components/common/ExplainableValue.vue'
import BaseModal from '@/components/common/BaseModal.vue'

type Plan = Database['public']['Tables']['plans']['Row']

const savingsStore = useSavingsStore()
const plansStore = usePlansStore()
const authStore = useAuthStore()

const { currentPlan } = useLoadOnActivePlan((planId) => savingsStore.load(planId))

function planLabel(plan: Pick<Plan, 'type' | 'name'>): string {
  return `${plan.type === 'individual' ? '👤' : '🤝'} ${plan.name}`
}

// Says outright who can see the goals on screen, since that follows from
// which plan they're in rather than from anything on the goal itself.
const currentPlanNote = computed(() => {
  if (!currentPlan.value) return ''
  const audience =
    currentPlan.value.type === 'individual' ? 'bare du ser disse' : 'delt med alle i planen'
  return `${planLabel(currentPlan.value)} · ${audience}`
})

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

const isGoalFormOpen = ref(false)
const goalName = ref('')
const goalTargetAmount = ref<number | null>(null)
const goalTargetDate = ref('')
const goalTheme = ref<SavingsGoalTheme>('other')

// null means "the active plan", so the default follows whichever plan is
// active when the sheet opens -- even if plans are still loading then,
// as when arriving from the tab bar's "+" sheet.
const goalPlanId = ref<string | null>(null)
const selectedGoalPlanId = computed({
  get: () => goalPlanId.value ?? currentPlan.value?.id ?? '',
  set: (id: string) => {
    goalPlanId.value = id
  },
})
const selectedGoalPlan = computed(
  () => plansStore.myPlans.find((plan) => plan.id === selectedGoalPlanId.value) ?? null,
)

function openGoalForm() {
  goalPlanId.value = null
  isGoalFormOpen.value = true
}

useAddFromQuery(openGoalForm)

// Set after adding a goal to another plan than the one on screen: it
// won't show up in this list, so without a word it'd seem to vanish.
const addedElsewhere = ref<{ goalName: string; planId: string; planLabel: string } | null>(null)

watch(
  () => currentPlan.value?.id,
  () => {
    addedElsewhere.value = null
  },
)

const {
  loading: creatingGoal,
  error: createGoalError,
  run: runCreateGoal,
} = useAsyncAction(async () => {
  const plan = selectedGoalPlan.value
  const name = goalName.value.trim()
  if (!plan || !name || goalTargetAmount.value == null || !goalTargetDate.value) return

  await savingsStore.createGoal({
    planId: plan.id,
    name,
    targetAmount: goalTargetAmount.value,
    targetDate: goalTargetDate.value,
    theme: goalTheme.value,
  })
  addedElsewhere.value =
    plan.id === currentPlan.value?.id
      ? null
      : { goalName: name, planId: plan.id, planLabel: planLabel(plan) }
  goalName.value = ''
  goalTargetAmount.value = null
  goalTargetDate.value = ''
  goalTheme.value = 'other'
  isGoalFormOpen.value = false
})

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
  await savingsStore.addContribution({
    goalId: contributingGoalId.value,
    amount: contributionAmount.value,
    occurredOn: contributionDate.value,
    createdBy: authStore.user.id,
  })
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
      <div>
        <h1>Sparemål</h1>
        <p v-if="currentPlanNote" class="card-subtitle savings-plan-note">{{ currentPlanNote }}</p>
      </div>
      <button type="button" class="button-primary page-header-action" @click="openGoalForm">
        + Ny
      </button>
    </div>

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
      <button
        type="button"
        class="savings-remove"
        :aria-label="`Fjern sparemålet ${goal.name}`"
        @click="handleDeleteGoal(goal.id, goal.name)"
      >
        ✕
      </button>

      <div class="savings-cover" :style="{ background: SAVINGS_THEMES[goal.theme].gradient }">
        <span class="savings-cover-icon">{{ SAVINGS_THEMES[goal.theme].icon }}</span>
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

    <BaseModal v-model="isGoalFormOpen" title="Nytt sparemål">
      <form class="form" @submit.prevent="runCreateGoal()">
        <label class="form-field">
          Navn
          <input v-model="goalName" type="text" placeholder="F.eks. Ferie til Italia" required />
        </label>
        <label class="form-field">
          Tema
          <select v-model="goalTheme">
            <option v-for="(theme, key) in SAVINGS_THEMES" :key="key" :value="key">
              {{ theme.icon }} {{ theme.label }}
            </option>
          </select>
        </label>
        <label class="form-field">
          Målbeløp (kr)
          <input v-model.number="goalTargetAmount" type="number" min="0" step="1" required />
        </label>
        <label class="form-field">
          Måldato
          <input v-model="goalTargetDate" type="date" required />
        </label>
        <label v-if="plansStore.myPlans.length > 1" class="form-field">
          Plan
          <select v-model="selectedGoalPlanId">
            <option v-for="plan in plansStore.myPlans" :key="plan.id" :value="plan.id">
              {{ planLabel(plan) }}
            </option>
          </select>
        </label>
        <p v-if="selectedGoalPlan?.type === 'shared'" class="form-hint">
          Alle i planen kan se dette sparemålet, spare til det og fjerne det.
        </p>
        <p v-if="createGoalError" class="form-error">{{ createGoalError }}</p>
        <button type="submit" class="button-primary" :disabled="creatingGoal">
          {{ creatingGoal ? 'Legger til …' : 'Legg til sparemål' }}
        </button>
      </form>
    </BaseModal>
  </div>
</template>

<style scoped>
.savings-plan-note {
  margin: var(--space-1) 0 0;
}

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
  margin: calc(var(--space-4) * -1) calc(var(--space-4) * -1) var(--space-4);
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* Sits on the cover art, so it gets its own frosted backing to stay
   legible on every theme's gradient, light or dark. */
.savings-remove {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 1;
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

.savings-remove:hover {
  color: var(--color-danger);
}
</style>
