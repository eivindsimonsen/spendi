<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseModal from '@/components/common/BaseModal.vue'

const route = useRoute()
const router = useRouter()

const isAddSheetOpen = ref(false)

function goTo(path: string) {
  isAddSheetOpen.value = false
  router.push(path)
}
</script>

<template>
  <nav class="tab-bar" aria-label="Hovednavigasjon">
    <router-link to="/" class="tab-bar-item" :class="{ 'tab-bar-item-active': route.path === '/' }">
      <span class="tab-bar-icon" aria-hidden="true">🏠</span>
      <span class="tab-bar-label">Oversikt</span>
    </router-link>

    <button
      type="button"
      class="tab-bar-fab"
      aria-label="Legg til"
      @click="isAddSheetOpen = true"
    >
      <span class="tab-bar-fab-icon" aria-hidden="true"></span>
    </button>

    <router-link
      to="/account"
      class="tab-bar-item"
      :class="{ 'tab-bar-item-active': route.path === '/account' }"
    >
      <span class="tab-bar-icon" aria-hidden="true">👤</span>
      <span class="tab-bar-label">Konto</span>
    </router-link>
  </nav>

  <BaseModal v-model="isAddSheetOpen" title="Hva vil du legge til?">
    <div class="add-action-choices">
      <button type="button" class="add-action-choice" @click="goTo('/recurring-costs')">
        <span class="add-action-icon" aria-hidden="true">🔁</span>
        <span class="add-action-text">
          <strong>Fast utgift</strong>
          <small>Gjentar seg hver lønningsperiode (husleie, abonnement …)</small>
        </span>
      </button>
      <button type="button" class="add-action-choice" @click="goTo('/add-expense')">
        <span class="add-action-icon" aria-hidden="true">📌</span>
        <span class="add-action-text">
          <strong>Uforutsett utgift</strong>
          <small>Gjelder kun denne lønningsperioden</small>
        </span>
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom, 0);
  z-index: 50;
}

.tab-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-2) 0;
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.tab-bar-item-active {
  color: var(--color-primary);
}

.tab-bar-icon {
  font-size: 1.3rem;
}

.tab-bar-fab {
  position: relative;
  top: -18px;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 4px solid var(--color-surface);
  background-color: var(--color-primary);
  color: var(--color-primary-contrast);
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
}

.tab-bar-fab:hover {
  background-color: var(--color-primary-hover);
}

.tab-bar-fab-icon {
  /*
    Drawn with CSS bars rather than a "+" character -- text glyphs (and
    emoji, which also ignore `color` entirely) never sit perfectly
    optically centered, since that depends on font metrics.
  */
  position: relative;
  width: 18px;
  height: 18px;
}

.tab-bar-fab-icon::before,
.tab-bar-fab-icon::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  background-color: currentColor;
  border-radius: 2px;
}

.tab-bar-fab-icon::before {
  width: 100%;
  height: 3px;
  transform: translate(-50%, -50%);
}

.tab-bar-fab-icon::after {
  width: 3px;
  height: 100%;
  transform: translate(-50%, -50%);
}

.add-action-choices {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.add-action-choice {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  text-align: left;
}

.add-action-icon {
  font-size: 1.6rem;
}

.add-action-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.add-action-text small {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
</style>
