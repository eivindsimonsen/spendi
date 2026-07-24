<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { useSavingsStore } from '@/stores/savings.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { calculateRequiredMonthlySavings } from '@/core/savings-calculator'
import { formatCurrencyNOK } from '@/core/format'
import ExplainableValue from '@/components/common/ExplainableValue.vue'

const { currentPlan } = useCurrentPlan()
const savingsStore = useSavingsStore()
const authStore = useAuthStore()

watch(
  currentPlan,
  async (plan) => {
    if (!plan) return
    await savingsStore.load(plan.id)
  },
  { immediate: true },
)

const goalName = ref('')
const goalTargetAmount = ref<number | null>(null)
const goalTargetDate = ref('')

const {
  loading: creatingGoal,
  error: createGoalError,
  run: runCreateGoal,
} = useAsyncAction(async () => {
  if (!currentPlan.value || !goalName.value.trim() || goalTargetAmount.value == null || !goalTargetDate.value) {
    return
  }
  await savingsStore.createGoal({
    planId: currentPlan.value.id,
    name: goalName.value.trim(),
    targetAmount: goalTargetAmount.value,
    targetDate: goalTargetDate.value,
  })
  goalName.value = ''
  goalTargetAmount.value = null
  goalTargetDate.value = ''
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

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const contributingGoalId = ref<string | null>(null)
const contributionAmount = ref<number | null>(null)
const contributionDate = ref(today())

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
  contributionDate.value = today()
}
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>Sparemål</h1>
    </div>

    <section class="card">
      <h2>Nytt sparemål</h2>
      <form class="form" @submit.prevent="runCreateGoal()">
        <label class="form-field">
          Navn
          <input v-model="goalName" type="text" placeholder="F.eks. Ferie til Italia" required />
        </label>
        <label class="form-field">
          Målbeløp (kr)
          <input v-model.number="goalTargetAmount" type="number" min="0" step="1" required />
        </label>
        <label class="form-field">
          Måldato
          <input v-model="goalTargetDate" type="date" required />
        </label>
        <p v-if="createGoalError" class="form-error">{{ createGoalError }}</p>
        <button type="submit" class="button-primary" :disabled="creatingGoal">
          {{ creatingGoal ? 'Legger til …' : 'Legg til sparemål' }}
        </button>
      </form>
    </section>

    <section v-if="!savingsStore.goals.length" class="card">
      <p class="card-subtitle">Ingen sparemål registrert ennå.</p>
    </section>

    <section v-for="goal in savingsStore.goals" :key="goal.id" class="card">
      <h2>{{ goal.name }}</h2>
      <p class="card-subtitle">Måldato: {{ goal.target_date }}</p>

      <div class="progress-track savings-progress-track">
        <div class="progress-fill" :style="{ width: progressPercent(goal.id, goal.target_amount) + '%' }" />
      </div>
      <p class="card-subtitle">
        {{ formatCurrencyNOK(savingsStore.contributionsTotal(goal.id)) }} av
        {{ formatCurrencyNOK(goal.target_amount) }}
      </p>

      <div class="budget-row">
        <span>Nødvendig sparing per måned</span>
        <ExplainableValue :result="requiredMonthlySavings(goal)" />
      </div>

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
          <input v-model.number="contributionAmount" type="number" min="0" step="1" required autofocus />
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

      <button type="button" class="button-danger-link savings-remove-button" @click="savingsStore.deleteGoal(goal.id)">
        Fjern sparemål
      </button>
    </section>
  </div>
</template>

<style scoped>
.savings-progress-track {
  margin-bottom: var(--space-2);
}

.budget-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
}

.savings-contribute-button {
  width: 100%;
  margin-top: var(--space-2);
}

.savings-contribute-form {
  margin-top: var(--space-3);
}

.savings-remove-button {
  display: block;
  margin-top: var(--space-3);
}
</style>
