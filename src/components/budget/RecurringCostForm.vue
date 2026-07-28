<script setup lang="ts">
import { ref } from 'vue'
import CategoryPicker from '@/components/common/CategoryPicker.vue'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'

const props = defineProps<{ planId: string }>()
const emit = defineEmits<{ created: [] }>()

const recurringCostsStore = useRecurringCostsStore()
const authStore = useAuthStore()

const name = ref('')
const categoryId = ref('')
const amount = ref<number | null>(null)
const isVariable = ref(false)

const { loading, error, run } = useAsyncAction(async () => {
  if (!name.value.trim() || !categoryId.value || !authStore.user) return

  await recurringCostsStore.create({
    planId: props.planId,
    categoryId: categoryId.value,
    name: name.value.trim(),
    amount: amount.value,
    isVariable: isVariable.value,
    createdBy: authStore.user.id,
  })

  name.value = ''
  categoryId.value = ''
  amount.value = null
  isVariable.value = false
  emit('created')
})
</script>

<template>
  <form class="form" @submit.prevent="run()">
    <label class="form-field">
      Navn
      <input v-model="name" type="text" placeholder="F.eks. Strøm, Boliglån, Netflix" required />
    </label>
    <label class="form-field">
      Kategori
      <CategoryPicker v-model="categoryId" />
    </label>
    <label class="form-field-checkbox">
      <input v-model="isVariable" type="checkbox" />
      Denne utgiften varierer fra måned til måned (f.eks. strøm)
    </label>
    <label class="form-field">
      {{ isVariable ? 'Anslag (brukes til historikk finnes)' : 'Beløp per måned (kr)' }}
      <input v-model.number="amount" type="number" min="0" step="1" />
    </label>
    <p v-if="error" class="form-error">{{ error }}</p>
    <button type="submit" class="button-primary" :disabled="loading">
      {{ loading ? 'Legger til …' : 'Legg til fast kostnad' }}
    </button>
  </form>
</template>
