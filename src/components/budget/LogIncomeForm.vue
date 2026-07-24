<script setup lang="ts">
import { ref } from 'vue'
import { useIncomePaymentsStore } from '@/stores/income-payments.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'

const props = defineProps<{ planId: string }>()
const emit = defineEmits<{ logged: [] }>()

const incomePaymentsStore = useIncomePaymentsStore()
const authStore = useAuthStore()

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const amount = ref<number | null>(null)
const receivedOn = ref(today())

const { loading, error, run } = useAsyncAction(async () => {
  if (amount.value == null || !authStore.user) return

  await incomePaymentsStore.create({
    planId: props.planId,
    amount: amount.value,
    receivedOn: receivedOn.value,
    createdBy: authStore.user.id,
  })

  amount.value = null
  receivedOn.value = today()
  emit('logged')
})
</script>

<template>
  <form class="form" @submit.prevent="run()">
    <label class="form-field">
      Beløp mottatt (kr)
      <input v-model.number="amount" type="number" min="0" step="1" required autofocus />
    </label>
    <label class="form-field">
      Dato
      <input v-model="receivedOn" type="date" required />
    </label>
    <p v-if="error" class="form-error">{{ error }}</p>
    <button type="submit" class="button-primary" :disabled="loading">
      {{ loading ? 'Lagrer …' : 'Logg lønn' }}
    </button>
  </form>
</template>
