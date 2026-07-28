<script setup lang="ts">
import { ref } from 'vue'
import CategoryPicker from '@/components/common/CategoryPicker.vue'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { todayLocalDate } from '@/core/format'

const props = defineProps<{ planId: string }>()
const emit = defineEmits<{ created: [] }>()

const transactionsStore = useTransactionsStore()
const authStore = useAuthStore()

const amount = ref<number | null>(null)
const categoryId = ref('')
const occurredOn = ref(todayLocalDate())
const note = ref('')

const { loading, error, run } = useAsyncAction(async () => {
  if (amount.value == null || !categoryId.value || !authStore.user) return

  await transactionsStore.create({
    planId: props.planId,
    categoryId: categoryId.value,
    amount: amount.value,
    occurredOn: occurredOn.value,
    note: note.value || undefined,
    paidBy: authStore.user.id,
    createdBy: authStore.user.id,
  })

  amount.value = null
  categoryId.value = ''
  occurredOn.value = todayLocalDate()
  note.value = ''
  emit('created')
})
</script>

<template>
  <form class="form" @submit.prevent="run()">
    <label class="form-field">
      Beløp (kr)
      <input v-model.number="amount" type="number" min="0" step="1" required autofocus />
    </label>
    <label class="form-field">
      Kategori
      <CategoryPicker v-model="categoryId" />
    </label>
    <label class="form-field">
      Dato
      <input v-model="occurredOn" type="date" required />
    </label>
    <label class="form-field">
      Notat (valgfritt)
      <input v-model="note" type="text" placeholder="F.eks. Rema 1000" />
    </label>
    <p v-if="error" class="form-error">{{ error }}</p>
    <button type="submit" class="button-primary" :disabled="loading">
      {{ loading ? 'Lagrer …' : 'Legg til utgift' }}
    </button>
  </form>
</template>
