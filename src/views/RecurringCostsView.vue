<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useAuthStore } from '@/stores/auth.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import RecurringCostForm from '@/components/budget/RecurringCostForm.vue'
import { formatCurrencyNOK } from '@/core/format'
import type { Database } from '@/types/database.types'

type RecurringCost = Database['public']['Tables']['recurring_costs']['Row']

interface CostGroup {
  categoryId: string
  icon: string
  label: string
  items: RecurringCost[]
  monthlyTotal: number
  variableCount: number
}

const recurringCostsStore = useRecurringCostsStore()
const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()
const { categoryIcon, categoryName } = useCategoryLabel()

// Your costs belong to you, not to a plan, so unlike every other view
// this one loads once and never follows the active plan.
onMounted(async () => {
  if (!authStore.user) return
  await Promise.all([recurringCostsStore.loadMine(authStore.user.id), categoriesStore.load()])
})

// Grouped by category, which is the one axis that still separates a
// personal list -- there's no "whose is this" question left to answer
// here now that the page only ever shows your own costs.
const groups = computed<CostGroup[]>(() => {
  const byCategory = new Map<string, RecurringCost[]>()
  for (const cost of recurringCostsStore.myCosts) {
    const existing = byCategory.get(cost.category_id) ?? []
    existing.push(cost)
    byCategory.set(cost.category_id, existing)
  }

  return [...byCategory.entries()]
    .map(([categoryId, items]) => ({
      categoryId,
      icon: categoryIcon(categoryId),
      label: categoryName(categoryId),
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      ...subtotal(items),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

// A variable cost's amount is the monthly average you entered for it, so
// it belongs in the total like any other -- the "varierer" note is what
// marks that part of the sum as an estimate rather than a fixed bill.
function subtotal(items: RecurringCost[]) {
  let monthlyTotal = 0
  let variableCount = 0
  for (const item of items) {
    if (item.is_variable) variableCount++
    if (item.amount != null) monthlyTotal += item.amount
  }
  return { monthlyTotal, variableCount }
}

function groupMeta(group: CostGroup): string {
  const parts = [`${group.items.length} ${group.items.length === 1 ? 'utgift' : 'utgifter'}`]
  if (group.monthlyTotal > 0) parts.push(`${formatCurrencyNOK(group.monthlyTotal)}/mnd`)
  if (group.variableCount > 0) parts.push(`${group.variableCount} varierer`)
  return parts.join(' · ')
}

// A variable cost's amount is still worth showing -- it's the manual
// estimate used as the average until real transaction history exists
// (see core/variable-cost-estimator.ts), not just a placeholder.
function costAmountLabel(cost: RecurringCost): string {
  if (cost.is_variable) {
    return cost.amount != null ? `varierer · ${formatCurrencyNOK(cost.amount)}/mnd` : 'varierer'
  }
  return cost.amount != null ? `${formatCurrencyNOK(cost.amount)}/mnd` : ''
}

const collapsedGroups = ref(new Set<string>())

function isCollapsed(categoryId: string): boolean {
  return collapsedGroups.value.has(categoryId)
}

function toggleGroup(categoryId: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(categoryId)) next.delete(categoryId)
  else next.add(categoryId)
  collapsedGroups.value = next
}

async function handleDeactivate(costId: string, costName: string) {
  const confirmed = window.confirm(
    `Er du sikker på at du vil fjerne den faste utgiften "${costName}"?`,
  )
  if (!confirmed) return
  await recurringCostsStore.deactivate(costId)
}
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>Faste utgifter</h1>
      <p class="card-subtitle">
        Utgiftene dine følger deg inn i alle planene du er med i. Legg dem inn én gang her.
      </p>
    </div>

    <section class="card">
      <h2>Legg til ny</h2>
      <RecurringCostForm />
    </section>

    <section v-if="!recurringCostsStore.myCosts.length" class="card">
      <p class="card-subtitle">
        Ingen faste utgifter ennå. Legg inn den første over, så regner budsjettet med den i alle
        planene dine.
      </p>
    </section>

    <template v-else>
      <p class="section-eyebrow recurring-cost-eyebrow">Dine faste utgifter</p>

      <section v-for="group in groups" :key="group.categoryId" class="card recurring-cost-group">
        <button
          type="button"
          class="recurring-cost-group-header"
          :aria-expanded="!isCollapsed(group.categoryId)"
          @click="toggleGroup(group.categoryId)"
        >
          <span class="recurring-cost-group-icon" aria-hidden="true">{{ group.icon }}</span>
          <span class="recurring-cost-group-heading">
            <span class="recurring-cost-group-label">{{ group.label }}</span>
            <span class="card-subtitle">{{ groupMeta(group) }}</span>
          </span>
          <span
            class="recurring-cost-group-chevron"
            :class="{ 'recurring-cost-group-chevron-collapsed': isCollapsed(group.categoryId) }"
            aria-hidden="true"
            >›</span
          >
        </button>

        <ul v-if="!isCollapsed(group.categoryId)" class="recurring-cost-list">
          <li v-for="cost in group.items" :key="cost.id" class="list-row">
            <div>
              <p class="recurring-cost-name">{{ cost.name }}</p>
              <p v-if="costAmountLabel(cost)" class="card-subtitle">{{ costAmountLabel(cost) }}</p>
            </div>
            <button
              type="button"
              class="button-danger-link"
              @click="handleDeactivate(cost.id, cost.name)"
            >
              Fjern
            </button>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.recurring-cost-eyebrow {
  margin: 0 0 var(--space-2);
}

.recurring-cost-group {
  padding: 0;
}

.recurring-cost-group-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: none;
  border: none;
  padding: var(--space-4);
  color: var(--color-text);
  text-align: left;
}

.recurring-cost-group-header:active {
  opacity: 0.7;
}

.recurring-cost-group-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.recurring-cost-group-heading {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recurring-cost-group-label {
  font-weight: 700;
}

.recurring-cost-group-chevron {
  font-size: 1.5rem;
  color: var(--color-text-subtle);
  flex-shrink: 0;
  transform: rotate(90deg);
  transition: transform 0.15s ease;
}

.recurring-cost-group-chevron-collapsed {
  transform: rotate(0deg);
}

.recurring-cost-list {
  list-style: none;
  padding: 0 var(--space-4) var(--space-4);
  margin: 0;
}

.recurring-cost-name {
  margin: 0 0 var(--space-1);
  font-weight: 600;
}
</style>
