<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLoadOnActivePlan } from '@/composables/useLoadOnActivePlan'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useAuthStore } from '@/stores/auth.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import { useProfileNames } from '@/composables/useProfileNames'
import RecurringCostForm from '@/components/budget/RecurringCostForm.vue'
import { formatCurrencyNOK } from '@/core/format'
import type { Database } from '@/types/database.types'

type RecurringCost = Database['public']['Tables']['recurring_costs']['Row']

interface CostGroup {
  key: string
  icon: string
  label: string
  items: RecurringCost[]
  fixedTotal: number
  variableCount: number
}

const recurringCostsStore = useRecurringCostsStore()
const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()
const { categoryLabel, categoryIcon, categoryName } = useCategoryLabel()

const { currentPlan } = useLoadOnActivePlan((planId) =>
  Promise.all([recurringCostsStore.load(planId), categoriesStore.load(planId)]),
)

const { nameFor } = useProfileNames(() =>
  recurringCostsStore.recurringCosts.map((cost) => cost.created_by),
)

function subtotal(items: RecurringCost[]) {
  let fixedTotal = 0
  let variableCount = 0
  for (const item of items) {
    if (item.is_variable) variableCount++
    else if (item.amount != null) fixedTotal += item.amount
  }
  return { fixedTotal, variableCount }
}

function sortByCategoryThenName(items: RecurringCost[]): RecurringCost[] {
  return [...items].sort(
    (a, b) =>
      categoryName(a.category_id).localeCompare(categoryName(b.category_id)) ||
      a.name.localeCompare(b.name),
  )
}

function groupByOwner(costs: RecurringCost[]): CostGroup[] {
  const byOwner = new Map<string, RecurringCost[]>()
  for (const cost of costs) {
    const existing = byOwner.get(cost.created_by) ?? []
    existing.push(cost)
    byOwner.set(cost.created_by, existing)
  }

  const groups = [...byOwner.entries()].map(([ownerId, items]) => ({
    key: ownerId,
    icon: '👤',
    label: ownerId === authStore.user?.id ? 'Deg' : nameFor(ownerId),
    items: sortByCategoryThenName(items),
    ...subtotal(items),
  }))

  // Your own costs first, then everyone else alphabetically -- the whole
  // point of grouping by owner is finding "which of these are mine".
  return groups.sort((a, b) => {
    if (a.key === authStore.user?.id) return -1
    if (b.key === authStore.user?.id) return 1
    return a.label.localeCompare(b.label)
  })
}

function groupByCategory(costs: RecurringCost[]): CostGroup[] {
  const byCategory = new Map<string, RecurringCost[]>()
  for (const cost of costs) {
    const existing = byCategory.get(cost.category_id) ?? []
    existing.push(cost)
    byCategory.set(cost.category_id, existing)
  }

  return [...byCategory.entries()]
    .map(([categoryId, items]) => ({
      key: categoryId,
      icon: categoryIcon(categoryId),
      label: categoryName(categoryId),
      items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      ...subtotal(items),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// A shared plan's whole problem is "is this mine or my partner's", so
// group by owner there. An individual plan only ever has one owner, so
// group by category instead -- still useful, and keeps a long list
// scannable either way.
const groups = computed<CostGroup[]>(() => {
  const costs = recurringCostsStore.recurringCosts
  return currentPlan.value?.type === 'shared' ? groupByOwner(costs) : groupByCategory(costs)
})

function groupMeta(group: CostGroup): string {
  const parts = [`${group.items.length} ${group.items.length === 1 ? 'utgift' : 'utgifter'}`]
  if (group.fixedTotal > 0) parts.push(`${formatCurrencyNOK(group.fixedTotal)}/mnd`)
  if (group.variableCount > 0) parts.push(`${group.variableCount} varierer`)
  return parts.join(' · ')
}

const collapsedGroups = ref(new Set<string>())

function isCollapsed(key: string): boolean {
  return collapsedGroups.value.has(key)
}

function toggleGroup(key: string) {
  const next = new Set(collapsedGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedGroups.value = next
}

async function handleDeactivate(costId: string, costName: string) {
  const confirmed = window.confirm(`Er du sikker på at du vil fjerne den faste utgiften "${costName}"?`)
  if (!confirmed) return
  await recurringCostsStore.deactivate(costId)
}
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>Faste utgifter</h1>
    </div>

    <section class="card">
      <h2>Legg til ny</h2>
      <RecurringCostForm v-if="currentPlan" :plan-id="currentPlan.id" />
    </section>

    <section v-if="!recurringCostsStore.recurringCosts.length" class="card">
      <p class="card-subtitle">Ingen faste kostnader registrert ennå.</p>
    </section>

    <template v-else>
      <p class="section-eyebrow recurring-cost-eyebrow">Dine faste kostnader</p>

      <section v-for="group in groups" :key="group.key" class="card recurring-cost-group">
        <button
          type="button"
          class="recurring-cost-group-header"
          :aria-expanded="!isCollapsed(group.key)"
          @click="toggleGroup(group.key)"
        >
          <span class="recurring-cost-group-icon" aria-hidden="true">{{ group.icon }}</span>
          <span class="recurring-cost-group-heading">
            <span class="recurring-cost-group-label">{{ group.label }}</span>
            <span class="card-subtitle">{{ groupMeta(group) }}</span>
          </span>
          <span
            class="recurring-cost-group-chevron"
            :class="{ 'recurring-cost-group-chevron-collapsed': isCollapsed(group.key) }"
            aria-hidden="true"
            >›</span
          >
        </button>

        <ul v-if="!isCollapsed(group.key)" class="recurring-cost-list">
          <li v-for="cost in group.items" :key="cost.id" class="list-row">
            <div>
              <p class="recurring-cost-name">{{ cost.name }}</p>
              <p class="card-subtitle">
                {{ categoryLabel(cost.category_id) }}
                <span v-if="cost.is_variable">· varierer</span>
                <span v-else-if="cost.amount != null">· {{ formatCurrencyNOK(cost.amount) }}/mnd</span>
              </p>
            </div>
            <button type="button" class="button-danger-link" @click="handleDeactivate(cost.id, cost.name)">
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
