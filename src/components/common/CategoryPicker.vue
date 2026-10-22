<script setup lang="ts">
import { onMounted } from 'vue'
import { useCategoriesStore } from '@/stores/categories.store'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const categoriesStore = useCategoriesStore()

// Forms using this open from the tab bar's "+" sheet on any page, not
// only on pages that already loaded categories for something else.
onMounted(() => {
  if (!categoriesStore.categories.length) void categoriesStore.load()
})

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
