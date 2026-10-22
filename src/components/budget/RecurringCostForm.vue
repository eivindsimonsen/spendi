<script setup lang="ts">
import { computed, ref } from 'vue'
import CategoryPicker from '@/components/common/CategoryPicker.vue'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { Database } from '@/types/database.types'

type RecurringCost = Database['public']['Tables']['recurring_costs']['Row']

// With `cost` set the form edits that cost instead of adding a new one.
// Its fields are copied in once at setup, so the parent should remount
// the form (e.g. via `:key`) when switching to a different cost.
const props = defineProps<{ cost?: RecurringCost | null }>()
const emit = defineEmits<{ saved: [] }>()

const recurringCostsStore = useRecurringCostsStore()
const authStore = useAuthStore()

const name = ref(props.cost?.name ?? '')
const categoryId = ref(props.cost?.category_id ?? '')
const amount = ref<number | null>(props.cost?.amount ?? null)
const isVariable = ref(props.cost?.is_variable ?? false)

const { loading, error, run } = useAsyncAction(async () => {
  if (!name.value.trim() || !categoryId.value || !authStore.user) return

  const fields = {
    categoryId: categoryId.value,
    name: name.value.trim(),
    // v-model.number leaves '' behind when the field is cleared, which
    // the numeric column would reject -- an empty field means "no amount".
    amount: typeof amount.value === 'number' ? amount.value : null,
    isVariable: isVariable.value,
  }

  if (props.cost) {
    await recurringCostsStore.update(props.cost.id, fields)
  } else {
    await recurringCostsStore.create({ ownerId: authStore.user.id, ...fields })
    name.value = ''
    categoryId.value = ''
    amount.value = null
    isVariable.value = false
  }
  emit('saved')
})

const submitLabel = computed(() => {
  if (props.cost) return loading.value ? 'Lagrer …' : 'Lagre endring'
  return loading.value ? 'Legger til …' : 'Legg til fast utgift'
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
    <label class="form-field">
      {{ isVariable ? 'Anslag (brukes til historikk finnes)' : 'Beløp per måned (kr)' }}
      <input v-model.number="amount" type="number" inputmode="numeric" min="0" step="1" />
    </label>
    <label class="form-field-checkbox">
      <input v-model="isVariable" type="checkbox" />
      Denne utgiften varierer fra måned til måned (f.eks. strøm)
    </label>
    <p v-if="error" class="form-error">{{ error }}</p>
    <button type="submit" class="button-primary" :disabled="loading">
      {{ submitLabel }}
    </button>
  </form>
</template>
