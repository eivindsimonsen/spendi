<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, RouterView, RouterLink } from 'vue-router';

const route = useRoute();

const showNav = computed(() => {
  return route.path !== '/login';
});
</script>

<template>
  <div class="app-container">
    <header v-if="showNav" class="nav-container desktop-nav">
      <nav>
        <RouterLink to="/" class="nav-item">Oversikt</RouterLink>
        <RouterLink to="/household" class="nav-item">Husholdning</RouterLink>
        <RouterLink to="/user" class="nav-item">Bruker</RouterLink>
      </nav>
    </header>

    <main class="main-content">
      <RouterView />
    </main>

    <footer v-if="showNav" class="nav-container mobile-nav">
      <nav>
        <RouterLink to="/" class="nav-item">Oversikt</RouterLink>
        <RouterLink to="/household" class="nav-item">Husholdning</RouterLink>
        <RouterLink to="/user" class="nav-item">Bruker</RouterLink>
      </nav>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: var(--background-color);
  color: var(--text-color);
}

.main-content {
  flex: 1;
  padding: 1rem;
  /* Add padding for mobile nav to prevent occlusion */
  padding-bottom: 80px; 
}

/* Navigation Styles */
.nav-container {
  background-color: white;
  border-top: 1px solid var(--text-color-tertiary);
  padding: 1rem;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.nav-container nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.nav-item {
  text-decoration: none;
  color: var(--text-color-secondary);
  font-family: var(--font-family-secondary);
  font-weight: 500;
  padding: 0.5rem;
  border-radius: 8px;
  transition: color 0.2s, background-color 0.2s;
}

.nav-item.router-link-active {
  color: var(--primary-color);
  background-color: #F3F4F6; /* Light gray/primary tint */
}

/* Mobile Default */
.desktop-nav {
  display: none;
}

.mobile-nav {
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 100;
}

/* Desktop Overrides */
@media (min-width: 768px) {
  .mobile-nav {
    display: none;
  }

  .desktop-nav {
    display: block;
    position: sticky;
    top: 0;
    z-index: 100;
    border-top: none;
    border-bottom: 1px solid var(--text-color-tertiary);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  }

  .desktop-nav nav {
    justify-content: center;
    gap: 2rem;
  }

  .main-content {
    padding-bottom: 1rem; /* Reset padding on desktop */
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }
}
</style>
