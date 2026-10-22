<script setup lang="ts">
import { useToastStore } from '@/stores/toast.store'

const toastStore = useToastStore()
</script>

<template>
  <!-- The live region stays mounted even when empty: screen readers only
       announce changes inside a region that was already there. -->
  <div class="toast-region" role="status" aria-live="polite">
    <Transition name="toast">
      <button v-if="toastStore.message" type="button" class="toast" @click="toastStore.dismiss()">
        <span class="toast-icon" aria-hidden="true">✓</span>
        <span>{{ toastStore.message }}</span>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
/* Pinned to the top so it clears the tab bar and any sheet at the
   bottom; above the modal backdrop (z-index 100) in case a sheet is
   still sliding out when it appears. */
.toast-region {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--space-3));
  left: var(--space-4);
  right: var(--space-4);
  display: flex;
  justify-content: center;
  pointer-events: none;
  z-index: 110;
}

.toast {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 400px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-strong);
  backdrop-filter: blur(var(--blur-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass));
  box-shadow: var(--shadow-lg);
  color: var(--color-text);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
}

.toast-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-success);
  color: var(--color-primary-contrast);
  font-size: 0.75rem;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
