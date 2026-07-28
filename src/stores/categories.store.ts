import { ref } from 'vue'
import { defineStore } from 'pinia'
import { categoriesService, type CreateCategoryInput } from '@/services/categories.service'
import type { Database } from '@/types/database.types'

type Category = Database['public']['Tables']['categories']['Row']

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const loaded = ref(false)

  async function load(planId: string) {
    categories.value = await categoriesService.listVisible(planId)
    loaded.value = true
  }

  async function createCustom(input: CreateCategoryInput) {
    const created = await categoriesService.createCustom(input)
    categories.value = [...categories.value, created].sort((a, b) => a.name.localeCompare(b.name))
    return created
  }

  async function update(id: string, changes: { name?: string; icon?: string }) {
    const updated = await categoriesService.updateCustom(id, changes)
    categories.value = categories.value
      .map((category) => (category.id === id ? updated : category))
      .sort((a, b) => a.name.localeCompare(b.name))
    return updated
  }

  async function remove(id: string) {
    await categoriesService.deleteCustom(id)
    categories.value = categories.value.filter((category) => category.id !== id)
  }

  return { categories, loaded, load, createCustom, update, remove }
})
