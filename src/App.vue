<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import AppTabBar from '@/components/layout/AppTabBar.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="app-layout">
    <main class="main-content">
      <router-view />
    </main>
    <AppTabBar v-if="auth.isAuthenticated" />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100dvh;
  background-color: var(--color-background);
  color: var(--color-text);
}

.main-content {
  padding-bottom: 64px;
}
</style>
