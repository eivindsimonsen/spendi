<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import AppTabBar from '@/components/layout/AppTabBar.vue'
import UpdatePrompt from '@/components/common/UpdatePrompt.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="app-layout">
    <UpdatePrompt />
    <main class="main-content">
      <router-view />
    </main>
    <AppTabBar v-if="auth.isAuthenticated" />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100dvh;
  color: var(--color-text);
}

.main-content {
  /* Clears the floating tab bar (its own height + how far it floats off
     the bottom edge) so the last card in any view isn't hidden behind it. */
  padding-bottom: 96px;
}
</style>
