<script setup lang="ts">
// HouseholdView.vue
</script>

<template>
  <div class="container page-content">
    <header class="page-header">
      <h1>Household</h1>
      <p class="subtitle">Shared expenses and contributions</p>
    </header>

    <div class="cards-grid">
      <Card class="custom-card">
        <template #title>Shared Budget</template>
        <template #content>
          <p class="placeholder-text">Total Pool: $2,500</p>
        </template>
      </Card>

      <Card class="custom-card">
        <template #title>Shared Transactions</template>
        <template #content>
          <p class="placeholder-text">Utility Bill: $150</p>
          <p class="placeholder-text">Rent: $1,200</p>
        </template>
      </Card>

      <Card class="custom-card">
        <template #title>Contributions</template>
        <template #content>
          <p class="placeholder-text">You: $1,250</p>
          <p class="placeholder-text">Partner: $1,250</p>
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

.custom-card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.25rem;
}

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

