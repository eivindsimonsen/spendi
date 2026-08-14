<script setup lang="ts">
import { ref } from 'vue'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useIncomeStore } from '@/stores/income.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useBudgetRecommendation } from '@/composables/useBudgetRecommendation'
import { formatCurrencyNOK, formatShortDate, todayLocalDate } from '@/core/format'
import type { Database } from '@/types/database.types'

type IncomePayment = Database['public']['Tables']['income_payments']['Row']

const INCOME_TYPES = ['Lønn', 'Bonus', 'Gave', 'Annet']

const { currentPlan } = useCurrentPlan()
const incomePaymentsStore = useIncomePaymentsStore()
const incomeStore = useIncomeStore()
const authStore = useAuthStore()

const { periodIncomeTotal, memberName } = useBudgetRecommendation(currentPlan)

// "Nei" just hides the suggestion for this visit -- not persisted, so it
// may reappear on the next visit while the weekend-payday window is
// still open. That's an acceptable minor friction over adding a whole
// second piece of stored state just to remember a dismissal.
const suggestionDismissed = ref(false)

const { loading: confirmingSuggestion, run: confirmSuggestion } = useAsyncAction(async () => {
  const suggestion = incomeStore.earlyPeriodSuggestion
  if (!currentPlan.value || !authStore.user || !suggestion) return
  await incomeStore.confirmEarlyPeriod(currentPlan.value.id, authStore.user.id, suggestion)
})

async function cancelOverride() {
  if (!currentPlan.value || !authStore.user) return
  await incomeStore.cancelPeriodOverride(currentPlan.value.id, authStore.user.id)
}

const isFormOpen = ref(false)
const editingId = ref<string | null>(null)
const amount = ref<number | null>(null)
const receivedOn = ref(todayLocalDate())
const incomeType = ref(INCOME_TYPES[0]!)

function startAdding() {
  editingId.value = null
  amount.value = null
  receivedOn.value = todayLocalDate()
  incomeType.value = INCOME_TYPES[0]!
  isFormOpen.value = true
}

function startEditing(payment: IncomePayment) {
  editingId.value = payment.id
  amount.value = payment.amount
  receivedOn.value = payment.received_on
  incomeType.value = payment.income_type
  isFormOpen.value = true
}

const {
  loading: saving,
  error: saveError,
  run: runSave,
} = useAsyncAction(async () => {
  if (amount.value == null || !currentPlan.value || !authStore.user) return

  if (editingId.value) {
    await incomePaymentsStore.update(editingId.value, {
      amount: amount.value,
      receivedOn: receivedOn.value,
      incomeType: incomeType.value,
    })
  } else {
    await incomePaymentsStore.create({
      planId: currentPlan.value.id,
      amount: amount.value,
      receivedOn: receivedOn.value,
      incomeType: incomeType.value,
      createdBy: authStore.user.id,
    })
  }
  isFormOpen.value = false
})

async function removePayment(id: string) {
  const confirmed = window.confirm('Er du sikker på at du vil fjerne denne inntekten?')
  if (!confirmed) return
  await incomePaymentsStore.remove(id)
}
</script>

<template>
  <div class="container">
    <router-link to="/" class="button-link back-link">← Tilbake til oversikt</router-link>

    <div class="page-header">
      <h1>Lønn</h1>
    </div>

    <section class="card">
      <h2>Denne perioden</h2>

      <div
        v-if="incomeStore.earlyPeriodSuggestion && !suggestionDismissed"
        class="period-suggestion"
      >
        <p class="period-suggestion-text">
          ⚡ Lønningsdagen din faller på en helg denne måneden. Fikk du lønn allerede ({{
            formatShortDate(incomeStore.earlyPeriodSuggestion)
          }})?
        </p>
        <p v-if="currentPlan?.type === 'shared'" class="card-subtitle period-suggestion-note">
          Påvirker ikke resten av Spendiplanen.
        </p>
        <div class="period-suggestion-actions">
          <button
            type="button"
            class="button-primary"
            :disabled="confirmingSuggestion"
            @click="confirmSuggestion()"
          >
            {{ confirmingSuggestion ? 'Starter …' : 'Ja, start ny periode' }}
          </button>
          <button
            type="button"
            class="period-suggestion-decline"
            :disabled="confirmingSuggestion"
            @click="suggestionDismissed = true"
          >
            Nei
          </button>
        </div>
      </div>

      <p v-if="incomeStore.activeOverrideDate" class="card-subtitle period-override-notice">
        Perioden startet tidlig ({{ formatShortDate(new Date(incomeStore.activeOverrideDate)) }}).
        <button type="button" class="button-link" @click="cancelOverride">Angre</button>
      </p>

      <p class="amount-hero income-total">{{ formatCurrencyNOK(periodIncomeTotal) }}</p>

      <p v-if="!incomePaymentsStore.currentPeriodPayments.length" class="card-subtitle">
        Ingen inntekt logget for denne perioden ennå.
      </p>
      <ul v-else class="income-list">
        <li
          v-for="payment in incomePaymentsStore.currentPeriodPayments"
          :key="payment.id"
          class="list-row"
        >
          <div>
            <p class="income-item-amount">{{ formatCurrencyNOK(payment.amount) }}</p>
            <p class="card-subtitle">
              {{ payment.income_type }} · {{ memberName(payment.created_by) }} ·
              {{ payment.received_on }}
            </p>
          </div>
          <div class="income-item-actions">
            <button type="button" class="button-link" @click="startEditing(payment)">
              Rediger
            </button>
            <button type="button" class="button-danger-link" @click="removePayment(payment.id)">
              Fjern
            </button>
          </div>
        </li>
      </ul>

      <button v-if="!isFormOpen" type="button" class="button-primary" @click="startAdding">
        Legg til inntekt
      </button>

      <form v-else class="form income-form" @submit.prevent="runSave()">
        <label class="form-field">
          Beløp (kr)
          <input v-model.number="amount" type="number" min="0" step="1" required autofocus />
        </label>
        <label class="form-field">
          Type
          <select v-model="incomeType">
            <option v-for="type in INCOME_TYPES" :key="type" :value="type">{{ type }}</option>
          </select>
        </label>
        <label class="form-field">
          Dato
          <input v-model="receivedOn" type="date" required />
        </label>
        <p v-if="saveError" class="form-error">{{ saveError }}</p>
        <div class="income-form-actions">
          <button type="submit" class="button-primary" :disabled="saving">
            {{ saving ? 'Lagrer …' : editingId ? 'Lagre endring' : 'Legg til' }}
          </button>
          <button type="button" class="button-link" @click="isFormOpen = false">Avbryt</button>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.period-suggestion {
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-strong);
}

.period-suggestion-text {
  margin: 0 0 var(--space-2);
}

.period-suggestion-note {
  margin: 0 0 var(--space-2);
}

.period-suggestion-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.period-suggestion-decline {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-muted);
}

.period-override-notice {
  margin: 0 0 var(--space-3);
}

.income-total {
  margin: 0 0 var(--space-3);
}

.income-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-4);
}

.income-item-amount {
  margin: 0;
  font-weight: 700;
}

.income-item-actions {
  display: flex;
  gap: var(--space-3);
}

.income-form {
  margin-top: var(--space-2);
}

.income-form-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}
</style>
