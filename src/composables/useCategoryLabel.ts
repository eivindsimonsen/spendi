import { useCategoriesStore } from '@/stores/categories.store'

// Shared category lookups -- icon, name, and the combined "icon + name"
// label -- used anywhere a transaction/recurring cost needs to display or
// group by its category.
export function useCategoryLabel() {
  const categoriesStore = useCategoriesStore()

  function findCategory(categoryId: string) {
    return categoriesStore.categories.find((category) => category.id === categoryId)
  }

  function categoryIcon(categoryId: string): string {
    return findCategory(categoryId)?.icon ?? ''
  }

  function categoryName(categoryId: string): string {
    return findCategory(categoryId)?.name ?? 'Ukjent kategori'
  }

  function categoryLabel(categoryId: string): string {
    const category = findCategory(categoryId)
    return category ? `${category.icon ?? ''} ${category.name}`.trim() : 'Ukjent kategori'
  }

  return { categoryLabel, categoryIcon, categoryName }
}
