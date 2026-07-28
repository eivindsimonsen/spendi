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

    <button type="button" class="tab-bar-fab" aria-label="Legg til" @click="isAddSheetOpen = true">
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
      <button type="button" class="add-action-choice" @click="goTo('/savings')">
        <span class="add-action-icon" aria-hidden="true">🎯</span>
        <span class="add-action-text">
          <strong>Opprett spareplan</strong>
          <small>F.eks. ferie, bryllup eller bolig</small>
        </span>
      </button>

      <p class="add-action-divider">Ny plan</p>

      <button type="button" class="add-action-choice" @click="goTo('/plans/new')">
        <span class="add-action-icon" aria-hidden="true">📋</span>
        <span class="add-action-text">
          <strong>Opprett individuell plan</strong>
          <small>Et eget budsjett, kun for deg</small>
        </span>
      </button>
      <button type="button" class="add-action-choice" @click="goTo('/friends')">
        <span class="add-action-icon" aria-hidden="true">🤝</span>
        <span class="add-action-text">
          <strong>Opprett plan med en venn</strong>
          <small>En delt Spendiplan, f.eks. med samboeren</small>
        </span>
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  /* Floats clear of the edges (and the home-indicator safe area) rather
     than sitting flush against the screen edge -- just a small gap, not
     the large one this used to have. */
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-1));
  left: var(--space-4);
  right: var(--space-4);
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(var(--blur-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  z-index: 50;
}

.tab-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-3) 0;
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  transition: color 0.15s ease;
}

.tab-bar-item-active {
  color: var(--color-primary);
}

.tab-bar-icon {
  font-size: 1.3rem;
}

.tab-bar-fab {
  position: relative;
  top: -20px;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid var(--glass-highlight);
  background: linear-gradient(160deg, var(--color-primary-hover) 0%, var(--color-primary) 100%);
  color: var(--color-primary-contrast);
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.4),
    0 8px 20px rgba(139, 92, 246, 0.45);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.tab-bar-fab:hover {
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.4),
    0 10px 24px rgba(139, 92, 246, 0.55);
}

.tab-bar-fab:active {
  transform: scale(0.94);
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
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass-bg-strong);
  text-align: left;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.add-action-choice:active {
  transform: scale(0.98);
  background: var(--glass-bg);
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

.add-action-divider {
  margin: var(--space-1) 0 calc(var(--space-2) * -1);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-subtle);
}
</style>
