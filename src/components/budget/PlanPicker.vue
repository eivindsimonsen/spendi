<script setup lang="ts">
import { usePlansStore } from '@/stores/plans.store'

const plansStore = usePlansStore()

async function handleDelete(id: string) {
  const confirmed = window.confirm(
    'Er du sikker på at du vil slette denne planen? Dette fjerner permanent alle faste utgifter, transaksjoner, inntekt og sparemål knyttet til den.',
  )
  if (!confirmed) return

  try {
    await plansStore.deletePlan(id)
  } catch (err) {
    window.alert(err instanceof Error ? err.message : 'Kunne ikke slette planen.')
  }
}
</script>

<template>
  <div class="plan-picker">
    <div
      v-for="plan in plansStore.myPlans"
      :key="plan.id"
      class="plan-card"
      :class="{ 'plan-card-active': plan.id === plansStore.activePlanId }"
      role="button"
      tabindex="0"
      @click="plansStore.setActivePlan(plan.id)"
      @keydown.enter="plansStore.setActivePlan(plan.id)"
    >
      <div class="plan-card-header">
        <span class="plan-card-icon" aria-hidden="true">{{ plan.type === 'individual' ? '👤' : '🤝' }}</span>
        <button
          type="button"
          class="plan-card-delete"
          aria-label="Slett plan"
          @click.stop="handleDelete(plan.id)"
        >
          ✕
        </button>
      </div>
      <span class="plan-card-name">{{ plan.name }}</span>
      <span class="plan-card-type">{{ plan.type === 'individual' ? 'Individuell' : 'Delt' }}</span>
    </div>
  </div>
</template>

<style scoped>
.plan-picker {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  padding-bottom: var(--space-1);
  margin-bottom: var(--space-4);
}

.plan-card {
  flex: 1;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--blur-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass));
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.plan-card-active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
}

.plan-card:active {
  transform: scale(0.97);
}

.plan-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.plan-card-icon {
  font-size: 1.4rem;
}

.plan-card-delete {
  background: none;
  border: none;
  color: var(--color-text-subtle);
  font-size: 0.9rem;
  line-height: 1;
  padding: var(--space-1);
}

.plan-card-delete:hover {
  color: var(--color-danger);
}

.plan-card-name {
  font-weight: 700;
}

.plan-card-type {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
