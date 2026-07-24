<script setup lang="ts">
import { watch } from 'vue'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import { useRecurringCostsStore } from '@/stores/recurring-costs.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import RecurringCostForm from '@/components/budget/RecurringCostForm.vue'
import { formatCurrencyNOK } from '@/core/format'

const { currentPlan } = useCurrentPlan()
const recurringCostsStore = useRecurringCostsStore()
const categoriesStore = useCategoriesStore()
const { categoryLabel } = useCategoryLabel()

watch(
  currentPlan,
  async (plan) => {
    if (!plan) return
    await Promise.all([recurringCostsStore.load(plan.id), categoriesStore.load(plan.id)])
  },
  { immediate: true },
)
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

    <section class="card">
      <h2>Dine faste kostnader</h2>
      <ul v-if="recurringCostsStore.recurringCosts.length" class="recurring-cost-list">
        <li
          v-for="cost in recurringCostsStore.recurringCosts"
          :key="cost.id"
          class="recurring-cost-item"
        >
          <div>
            <p class="recurring-cost-name">{{ cost.name }}</p>
            <p class="card-subtitle">
              {{ categoryLabel(cost.category_id) }}
              <span v-if="cost.is_variable">· varierer</span>
              <span v-else-if="cost.amount != null">· {{ formatCurrencyNOK(cost.amount) }}/mnd</span>
            </p>
          </div>
          <button
            type="button"
            class="button-danger-link"
            @click="recurringCostsStore.deactivate(cost.id)"
          >
            Fjern
          </button>
        </li>
      </ul>
      <p v-else class="card-subtitle">Ingen faste kostnader registrert ennå.</p>
    </section>
  </div>
</template>

<style scoped>
.recurring-cost-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recurring-cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border);
}

.recurring-cost-item:first-child {
  border-top: none;
  padding-top: 0;
}

.recurring-cost-name {
  margin: 0 0 var(--space-1);
  font-weight: 600;
}
</style>
