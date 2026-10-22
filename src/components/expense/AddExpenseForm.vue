<script setup lang="ts">
import { ref } from 'vue'
import CategoryPicker from '@/components/common/CategoryPicker.vue'
import { useTransactionsStore } from '@/stores/transactions.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToastStore } from '@/stores/toast.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { todayLocalDate } from '@/core/format'

// No plan to pick: an expense belongs to whoever paid it and counts in
// every plan they're a member of.
const emit = defineEmits<{ created: [] }>()

const transactionsStore = useTransactionsStore()
const authStore = useAuthStore()
const toastStore = useToastStore()

const amount = ref<number | null>(null)
const name = ref('')
const categoryId = ref('')
const occurredOn = ref(todayLocalDate())

const { loading, error, run } = useAsyncAction(async () => {
  if (amount.value == null || !name.value.trim() || !categoryId.value || !authStore.user) return

  const created = await transactionsStore.create({
    name: name.value.trim(),
    categoryId: categoryId.value,
    amount: amount.value,
    occurredOn: occurredOn.value,
    paidBy: authStore.user.id,
    createdBy: authStore.user.id,
  })
  toastStore.show(`«${created.name}» er lagt til som uforutsett utgift.`)

  amount.value = null
  name.value = ''
  categoryId.value = ''
  occurredOn.value = todayLocalDate()
  emit('created')
})
</script>

<template>
  <form class="form" @submit.prevent="run()">
    <label class="form-field">
      Beløp (kr)
      <input
        v-model.number="amount"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        required
        autofocus
      />
    </label>
    <label class="form-field">
      Navn
      <input v-model="name" type="text" placeholder="F.eks. Tannlege, Bompenger" required />
    </label>
    <label class="form-field">
      Kategori
      <CategoryPicker v-model="categoryId" />
    </label>
    <label class="form-field">
      Dato
      <input v-model="occurredOn" type="date" required />
    </label>
    <p class="form-hint">Trekkes fra budsjettet i alle planene du er med i.</p>
    <p v-if="error" class="form-error">{{ error }}</p>
    <button type="submit" class="button-primary" :disabled="loading">
      {{ loading ? 'Lagrer …' : 'Legg til utgift' }}
    </button>
  </form>
</template>
