<script setup lang="ts">
import Nav from './components/Nav.vue'
</script>

<template>
  <div class="app-layout">
    <Nav />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100dvh;
  background-color: var(--background-color);
  color: var(--text-color);
}
</style>
