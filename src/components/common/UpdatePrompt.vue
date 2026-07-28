<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW()

function reload() {
  updateServiceWorker(true)
}

function dismiss() {
  needRefresh.value = false
}
</script>

<template>
  <div v-if="needRefresh" class="update-toast" role="alert">
    <span class="update-toast-text">En ny versjon av Spendi er klar.</span>
    <div class="update-toast-actions">
      <button type="button" class="update-toast-button" @click="reload">Oppdater</button>
      <button type="button" class="update-toast-dismiss" aria-label="Lukk" @click="dismiss">✕</button>
    </div>
  </div>
</template>

<style scoped>
.update-toast {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--space-3));
  left: var(--space-4);
  right: var(--space-4);
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  background: var(--glass-bg-strong);
  backdrop-filter: blur(var(--blur-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-3) var(--space-4);
  z-index: 100;
}

.update-toast-text {
  font-size: 0.9rem;
  font-weight: 600;
}

.update-toast-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.update-toast-button {
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, var(--color-primary-hover) 0%, var(--color-primary) 100%);
  color: var(--color-primary-contrast);
  font-size: 0.85rem;
  font-weight: 700;
}

.update-toast-dismiss {
  background: none;
  border: none;
  color: var(--color-text-subtle);
  font-size: 1rem;
  padding: var(--space-1);
}
</style>
