<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSavingsStore } from '@/stores/savings.store'
import { usePlansStore } from '@/stores/plans.store'
import { useToastStore } from '@/stores/toast.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useSavingsProgress } from '@/composables/useSavingsProgress'
import { formatPlanLabel } from '@/core/format'
import { SAVINGS_THEMES } from '@/core/savings-themes'
import type { Database, SavingsGoalTheme } from '@/types/database.types'

type SavingsGoal = Database['public']['Tables']['savings_goals']['Row']

// With `goal` set the form edits that goal instead of adding a new one.
// Its fields are copied in once at setup, so the parent should remount
// the form (e.g. via `:key`) when switching to a different goal.
const props = defineProps<{ goal?: SavingsGoal | null }>()
const emit = defineEmits<{ saved: [goal: SavingsGoal] }>()

const savingsStore = useSavingsStore()
const plansStore = usePlansStore()
const toastStore = useToastStore()
const { withCelebrations } = useSavingsProgress()

const name = ref(props.goal?.name ?? '')
const targetAmount = ref<number | null>(props.goal?.target_amount ?? null)
const targetDate = ref(props.goal?.target_date ?? '')
const theme = ref<SavingsGoalTheme>(props.goal?.theme ?? 'other')

// null means "the active plan", so the default follows whichever plan is
// active -- even if plans are still loading when the form opens.
const pickedPlanId = ref<string | null>(null)
const selectedPlanId = computed({
  get: () => pickedPlanId.value ?? plansStore.activePlanId ?? '',
  set: (id: string) => {
    pickedPlanId.value = id
  },
})
const selectedPlan = computed(
  () => plansStore.myPlans.find((plan) => plan.id === selectedPlanId.value) ?? null,
)

const { loading, error, run } = useAsyncAction(async () => {
  const trimmedName = name.value.trim()
  if (!trimmedName || targetAmount.value == null || !targetDate.value) return

  const details = {
    name: trimmedName,
    targetAmount: targetAmount.value,
    targetDate: targetDate.value,
    theme: theme.value,
  }

  // The plan is fixed once created -- see UpdateSavingsGoalInput. An
  // edit can still earn a badge, e.g. lowering the target below what's
  // already saved completes the goal.
  const goal = props.goal
  if (goal) {
    emit('saved', await withCelebrations(() => savingsStore.updateGoal(goal.id, details)))
    return
  }

  const plan = selectedPlan.value
  if (!plan) return
  const created = await withCelebrations(() =>
    savingsStore.createGoal({ planId: plan.id, ...details }),
  )
  // Names the plan, since it may not be the one on screen.
  toastStore.show(`Sparemålet «${created.name}» er opprettet i ${formatPlanLabel(plan)}.`)
  emit('saved', created)
})

const submitLabel = computed(() => {
  if (props.goal) return loading.value ? 'Lagrer …' : 'Lagre endring'
  return loading.value ? 'Legger til …' : 'Legg til sparemål'
})
</script>

<template>
  <form class="form" @submit.prevent="run()">
    <label class="form-field">
      Navn
      <input v-model="name" type="text" placeholder="F.eks. Ferie til Italia" required />
    </label>
    <label class="form-field">
      Tema
      <select v-model="theme">
        <option v-for="(option, key) in SAVINGS_THEMES" :key="key" :value="key">
          {{ option.icon }} {{ option.label }}
        </option>
      </select>
    </label>
    <label class="form-field">
      Målbeløp (kr)
      <input v-model.number="targetAmount" type="number" min="0" step="1" required />
    </label>
    <label class="form-field">
      Måldato
      <input v-model="targetDate" type="date" required />
    </label>
    <template v-if="!goal">
      <label v-if="plansStore.myPlans.length > 1" class="form-field">
        Plan
        <select v-model="selectedPlanId">
          <option v-for="plan in plansStore.myPlans" :key="plan.id" :value="plan.id">
            {{ formatPlanLabel(plan) }}
          </option>
        </select>
      </label>
      <p v-if="selectedPlan?.type === 'shared'" class="form-hint">
        Alle i planen kan se dette sparemålet, spare til det og fjerne det.
      </p>
    </template>
    <p v-if="error" class="form-error">{{ error }}</p>
    <button type="submit" class="button-primary" :disabled="loading">
      {{ submitLabel }}
    </button>
  </form>
</template>
