<script setup lang="ts">
// AccountView.vue
</script>

<template>
  <div class="container page-content">
    <header class="page-header">
      <h1>Account</h1>
      <p class="subtitle">Settings and preferences</p>
    </header>

    <div class="cards-grid">
      <Card class="custom-card">
        <template #title>Profile</template>
        <template #content>
          <p class="placeholder-text">John Doe</p>
          <p class="placeholder-text">john.doe@example.com</p>
        </template>
      </Card>

      <Card class="custom-card">
        <template #title>Categories</template>
        <template #content>
          <p class="placeholder-text">Manage your expense categories</p>
        </template>
      </Card>

      <Card class="custom-card">
        <template #title>Preferences</template>
        <template #content>
          <p class="placeholder-text">Currency: USD</p>
          <p class="placeholder-text">Theme: System</p>
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

