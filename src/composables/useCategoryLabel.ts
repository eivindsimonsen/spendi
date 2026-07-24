import { useCategoriesStore } from '@/stores/categories.store'

// Shared "icon + name" formatting for a category id, used anywhere a
// transaction/recurring cost needs to display its category.
export function useCategoryLabel() {
  const categoriesStore = useCategoriesStore()

  function categoryLabel(categoryId: string): string {
    const category = categoriesStore.categories.find((c) => c.id === categoryId)
    return category ? `${category.icon ?? ''} ${category.name}`.trim() : 'Ukjent kategori'
  }

  return { categoryLabel }
}
