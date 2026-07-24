<script setup lang="ts">
import { ref } from 'vue'
import { useCategoriesStore } from '@/stores/categories.store'

const props = defineProps<{ modelValue: string; planId: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const categoriesStore = useCategoriesStore()

const isCreatingCategory = ref(false)
const newCategoryName = ref('')

async function handleSelectChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === '__new__') {
    isCreatingCategory.value = true
    return
  }
  emit('update:modelValue', value)
}

async function createCategory() {
  if (!newCategoryName.value.trim()) return
  const created = await categoriesStore.createCustom({
    planId: props.planId,
    name: newCategoryName.value.trim(),
  })
  emit('update:modelValue', created.id)
  newCategoryName.value = ''
  isCreatingCategory.value = false
}

function cancelCreateCategory() {
  newCategoryName.value = ''
  isCreatingCategory.value = false
}
</script>

<template>
  <div class="category-picker">
    <select
      class="form-field-select"
      :value="isCreatingCategory ? '__new__' : modelValue"
      @change="handleSelectChange"
    >
      <option value="" disabled>Velg kategori</option>
      <option v-for="category in categoriesStore.categories" :key="category.id" :value="category.id">
        {{ category.icon }} {{ category.name }}
      </option>
      <option value="__new__">+ Ny kategori</option>
    </select>

    <div v-if="isCreatingCategory" class="category-picker-new">
      <input
        v-model="newCategoryName"
        type="text"
        placeholder="Navn på ny kategori"
        @keyup.enter="createCategory"
      />
      <button type="button" class="button-primary" @click="createCategory">Legg til</button>
      <button type="button" class="category-picker-cancel" @click="cancelCreateCategory">
        Avbryt
      </button>
    </div>
  </div>
</template>

<style scoped>
.category-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-field-select {
  font-size: 1rem;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text);
}

.category-picker-new {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.category-picker-new input {
  flex: 1;
  font-size: 1rem;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.category-picker-cancel {
  background: none;
  border: none;
  color: var(--color-text-muted);
}
</style>
