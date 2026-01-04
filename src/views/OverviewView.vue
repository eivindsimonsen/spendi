<script setup lang="ts">
// OverviewView.vue
</script>

<template>
  <div class="container page-content">
    <header class="page-header">
      <h1>Overview</h1>
      <p class="subtitle">Welcome back to your finances</p>
    </header>

    <div class="cards-grid">
      <Card class="custom-card">
        <template #title>Salary Summary</template>
        <template #content>
          <p class="placeholder-text">Next payout in 12 days</p>
        </template>
      </Card>

      <Card class="custom-card">
        <template #title>Budget Status</template>
        <template #content>
          <p class="placeholder-text">You have spent 65% of your monthly budget</p>
        </template>
      </Card>

      <Card class="custom-card">
        <template #title>Recent Transactions</template>
        <template #content>
          <p class="placeholder-text">Groceries - $125.50</p>
          <p class="placeholder-text">Netflix - $15.00</p>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.page-content {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 
  PrimeVue Card overrides for unstyled mode.
  We target the component's root class or structure if we can, 
  but with unstyled: true, PrimeVue removes most styles.
  We need to re-apply basic structure if needed, or rely on our classes.
  For unstyled PrimeVue, the `Card` component renders a div. 
  We add .custom-card to ensure we hit it.
*/
.custom-card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.25rem;
}

/* Deep selector to target slots if PrimeVue renders internal divs even in unstyled mode */
:deep(.p-card-title) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
}

:deep(.p-card-content) {
  color: var(--text-muted);
}

.placeholder-text {
  font-size: 0.9rem;
  line-height: 1.4;
}
</style>

