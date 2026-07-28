<script setup lang="ts">
import { ref, watch } from 'vue'
import { useIncomeStore } from '@/stores/income.store'
import { useAsyncAction } from '@/composables/useAsyncAction'

const props = defineProps<{ planId: string; profileId: string }>()
const emit = defineEmits<{ saved: [] }>()

const incomeStore = useIncomeStore()

const payday = ref(15)

watch(
  () => incomeStore.paySchedule,
  (schedule) => {
    if (schedule) payday.value = schedule.payday
  },
  { immediate: true },
)

const { loading, error, run } = useAsyncAction(async () => {
  await incomeStore.save({ planId: props.planId, profileId: props.profileId, payday: payday.value })
  emit('saved')
})
</script>

<template>
  <form class="form" @submit.prevent="run()">
    <label class="form-field">
      Hvilken dag i måneden får du lønn?
      <input v-model.number="payday" type="number" min="1" max="31" required />
    </label>
    <p class="form-hint">
      Vi bruker denne til å regne budsjettperioden fra lønningsdag til lønningsdag, i stedet for
      kalendermåned. I en delt Spendiplan setter hver person sin egen lønningsdag, og perioden
      følger den som får lønn tidligst i måneden, slik at alles lønn havner i samme periode.
    </p>
    <p v-if="error" class="form-error">{{ error }}</p>
    <button type="submit" class="button-primary" :disabled="loading">
      {{ loading ? 'Lagrer …' : 'Lagre lønningsdag' }}
    </button>
  </form>
</template>
