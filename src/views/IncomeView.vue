<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { format } from 'date-fns'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { useIncomeStore } from '@/stores/income.store'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { getPayPeriod } from '@/core/pay-schedule'
import { formatCurrencyNOK } from '@/core/format'
import { profilesService } from '@/services/profiles.service'
import PayScheduleForm from '@/components/budget/PayScheduleForm.vue'
import type { Database } from '@/types/database.types'

type IncomePayment = Database['public']['Tables']['income_payments']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

const INCOME_TYPES = ['Lønn', 'Bonus', 'Gave', 'Annet']

const { currentPlan } = useCurrentPlan()
const incomeStore = useIncomeStore()
const incomePaymentsStore = useIncomePaymentsStore()
const authStore = useAuthStore()

const contributorProfiles = ref(new Map<string, Profile>())

onMounted(() => {
  if (authStore.profile) {
    contributorProfiles.value.set(authStore.profile.id, authStore.profile)
  }
})

const currentPeriod = computed(() => {
  if (incomeStore.referencePayday == null) return null
  return getPayPeriod(incomeStore.referencePayday, new Date())
})

watch(
  currentPlan,
  async (plan) => {
    if (!plan || !authStore.user) return
    await incomeStore.load(plan.id, authStore.user.id)
  },
  { immediate: true },
)

watch(
  currentPeriod,
  async (period) => {
    if (!period || !currentPlan.value) return
    await incomePaymentsStore.loadForPeriod(
      currentPlan.value.id,
      format(period.start, 'yyyy-MM-dd'),
      format(period.end, 'yyyy-MM-dd'),
    )

    const contributorIds = [
      ...new Set(incomePaymentsStore.currentPeriodPayments.map((payment) => payment.created_by)),
    ].filter((id) => !contributorProfiles.value.has(id))

    if (contributorIds.length) {
      const profiles = await profilesService.listByIds(contributorIds)
      for (const profile of profiles) {
        contributorProfiles.value.set(profile.id, profile)
      }
    }
  },
  { immediate: true },
)

function contributorName(profileId: string): string {
  return contributorProfiles.value.get(profileId)?.display_name ?? 'Ukjent'
}

const periodTotal = computed(() =>
  incomePaymentsStore.currentPeriodPayments.reduce((sum, payment) => sum + payment.amount, 0),
)

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const isFormOpen = ref(false)
const editingId = ref<string | null>(null)
const amount = ref<number | null>(null)
const receivedOn = ref(today())
const incomeType = ref(INCOME_TYPES[0]!)

function startAdding() {
  editingId.value = null
  amount.value = null
  receivedOn.value = today()
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
      <p class="income-total">{{ formatCurrencyNOK(periodTotal) }}</p>

      <p v-if="!incomePaymentsStore.currentPeriodPayments.length" class="card-subtitle">
        Ingen lønn logget for denne perioden ennå.
      </p>
      <ul v-else class="income-list">
        <li
          v-for="payment in incomePaymentsStore.currentPeriodPayments"
          :key="payment.id"
          class="income-item"
        >
          <div>
            <p class="income-item-amount">{{ formatCurrencyNOK(payment.amount) }}</p>
            <p class="card-subtitle">
              {{ payment.income_type }} · {{ contributorName(payment.created_by) }} ·
              {{ payment.received_on }}
            </p>
          </div>
          <div class="income-item-actions">
            <button type="button" class="button-link" @click="startEditing(payment)">Rediger</button>
            <button type="button" class="button-danger-link" @click="removePayment(payment.id)">
              Fjern
            </button>
          </div>
        </li>
      </ul>

      <button v-if="!isFormOpen" type="button" class="button-primary" @click="startAdding">
        Legg til lønn
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

    <section class="card">
      <h2>Lønningsdag</h2>
      <p class="card-subtitle">
        Din egen lønningsdag for denne planen. I en delt Spendiplan setter hver person sin egen.
      </p>
      <PayScheduleForm v-if="currentPlan && authStore.user" :plan-id="currentPlan.id" :profile-id="authStore.user.id" />
    </section>
  </div>
</template>

<style scoped>
.income-total {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 var(--space-3);
}

.income-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-4);
}

.income-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--glass-border);
}

.income-item:first-child {
  border-top: none;
  padding-top: 0;
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
