<script setup lang="ts">
</script>

<template>
  <div class="page-container">
    <h2>Min Bruker</h2>
    <p>User profile settings will go here.</p>
    <button @click="$router.push('/login'); localStorage.removeItem('isAuthenticated')" class="logout-btn">Logg ut</button>
  </div>
</template>

<style scoped>
.page-container {
  padding: 1rem;
}
.logout-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--secondary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>

