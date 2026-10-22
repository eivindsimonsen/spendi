<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useAuthStore } from '@/stores/auth.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import RecurringCostForm from '@/components/budget/RecurringCostForm.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import ExplainableValue from '@/components/common/ExplainableValue.vue'
import SwipeAction from '@/components/common/SwipeAction.vue'
import { formatCurrencyNOK } from '@/core/format'
import { sumRecurringCosts } from '@/core/recurring-costs-total'
import type { Database } from '@/types/database.types'

type RecurringCost = Database['public']['Tables']['recurring_costs']['Row']

interface CostGroup {
  categoryId: string
  icon: string
  label: string
  items: RecurringCost[]
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
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

// Built from the grouped list rather than the store's, so the explanation
// lists the costs in the same order as the page does.
const monthlyTotal = computed(() =>
  sumRecurringCosts(
    groups.value.flatMap((group) =>
      group.items.map((cost) => ({
        name: cost.name,
        amount: cost.amount,
        isVariable: cost.is_variable,
      })),
    ),
  ),
)

// One sheet for both adding and editing: `editingCost` is null while
// adding. It's kept apart from the open flag so the form stays in the
// sheet while it slides out, instead of vanishing the moment it closes.
const editingCost = ref<RecurringCost | null>(null)
const isFormOpen = ref(false)

function startAdding() {
  editingCost.value = null
  isFormOpen.value = true
}

function startEditing(cost: RecurringCost) {
  editingCost.value = cost
  isFormOpen.value = true
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
    <div class="page-header page-header-with-action">
      <div>
        <h1>Faste utgifter</h1>
        <p class="card-subtitle recurring-cost-intro">Følger deg inn i alle planene du er med i.</p>
      </div>
      <button type="button" class="button-primary page-header-action" @click="startAdding">
        + Ny
      </button>
    </div>

    <section v-if="!recurringCostsStore.myCosts.length" class="card">
      <p class="card-subtitle">
        Ingen faste utgifter ennå. Legg inn den første med «Ny», så regner budsjettet med den i alle
        planene dine.
      </p>
    </section>

    <section v-else class="card">
      <p class="card-subtitle recurring-cost-swipe-hint">
        💡 Dra en utgift mot venstre for å fjerne den.
      </p>
      <div v-for="group in groups" :key="group.categoryId" class="recurring-cost-group">
        <p class="recurring-cost-category">
          <span aria-hidden="true">{{ group.icon }}</span> {{ group.label }}
        </p>
        <ul class="recurring-cost-list">
          <li v-for="cost in group.items" :key="cost.id">
            <SwipeAction label="Fjern" danger @action="handleDeactivate(cost.id, cost.name)">
              <div class="budget-row recurring-cost-row">
                <span class="recurring-cost-name">
                  {{ cost.name }}
                  <span v-if="cost.is_variable" class="recurring-cost-tag">varierer</span>
                </span>
                <span class="recurring-cost-amount">
                  {{ cost.amount != null ? formatCurrencyNOK(cost.amount) : '–' }}
                </span>
                <button
                  type="button"
                  class="recurring-cost-action"
                  :aria-label="`Rediger ${cost.name}`"
                  @click="startEditing(cost)"
                >
                  ✎
                </button>
              </div>
            </SwipeAction>
          </li>
        </ul>
      </div>

      <div class="budget-row recurring-cost-total">
        <span>Totalt per måned</span>
        <ExplainableValue :result="monthlyTotal" />
      </div>
    </section>

    <BaseModal v-model="isFormOpen" :title="editingCost ? 'Rediger fast utgift' : 'Ny fast utgift'">
      <RecurringCostForm
        :key="editingCost?.id ?? 'new'"
        :cost="editingCost"
        @saved="isFormOpen = false"
      />
    </BaseModal>
  </div>
</template>

<style scoped>
.recurring-cost-intro {
  margin: var(--space-1) 0 0;
}

.recurring-cost-swipe-hint {
  font-size: 0.8rem;
  margin: 0 0 var(--space-2);
}

.recurring-cost-group + .recurring-cost-group {
  margin-top: var(--space-3);
}

.recurring-cost-category {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-1);
}

.recurring-cost-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recurring-cost-row {
  gap: var(--space-2);
  padding: var(--space-1) 0;
}

.recurring-cost-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Marks the amount as your own estimate rather than a fixed bill. */
.recurring-cost-tag {
  display: inline-block;
  margin-left: var(--space-1);
  padding: 1px var(--space-2);
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.12);
  color: var(--color-primary-hover);
  font-size: 0.7rem;
  font-weight: 600;
  vertical-align: middle;
}

.recurring-cost-amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Icon-sized, but still a comfortable tap target on a phone. */
.recurring-cost-action {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-subtle);
  font-size: 0.95rem;
  line-height: 1;
}

.recurring-cost-action:hover {
  color: var(--color-primary);
}

.recurring-cost-total {
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  font-weight: 700;
  font-size: 1.05rem;
}
</style>
