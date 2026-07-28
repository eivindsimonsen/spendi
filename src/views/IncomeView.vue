<script setup lang="ts">
import { ref } from 'vue'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useBudgetRecommendation } from '@/composables/useBudgetRecommendation'
import { formatCurrencyNOK, todayLocalDate } from '@/core/format'
import type { Database } from '@/types/database.types'

type IncomePayment = Database['public']['Tables']['income_payments']['Row']

const INCOME_TYPES = ['Lønn', 'Bonus', 'Gave', 'Annet']

const { currentPlan } = useCurrentPlan()
const incomePaymentsStore = useIncomePaymentsStore()
const authStore = useAuthStore()

const { periodIncomeTotal, memberName } = useBudgetRecommendation(currentPlan)

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
