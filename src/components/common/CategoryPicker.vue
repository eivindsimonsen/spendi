<script setup lang="ts">
import { useCategoriesStore } from '@/stores/categories.store'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const categoriesStore = useCategoriesStore()

function handleChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <select :value="modelValue" @change="handleChange">
    <option value="" disabled>Velg kategori</option>
    <option v-for="category in categoriesStore.categories" :key="category.id" :value="category.id">
      {{ category.icon }} {{ category.name }}
    </option>
  </select>
</template>
