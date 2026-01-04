<script setup lang="ts">
  import { ref } from 'vue'
  
  type NavItem = {
    to: string
    label: string
    icon: string
    isOverview?: boolean
  }
  
  const navItems: NavItem[] = [
    { to: '/', label: 'Overview', icon: '🏠', isOverview: true },
    { to: '/budgets', label: 'Budgets', icon: '💰' },
    { to: '/household', label: 'Household', icon: '👪' },
    { to: '/account', label: 'Account', icon: '👤' },
  ]
  
  const isMenuOpen = ref(false)
  
  const setMenuOpen = (value: boolean) => {
    isMenuOpen.value = value
  }
  
  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen.value)
  }
  
  const closeMenu = () => {
    setMenuOpen(false)
  }
  </script>
  
  <template>
    <nav>
      <div class="logo">Spendi</div>
  
      <button
        class="hamburger"
        :class="{ open: isMenuOpen }"
        @click="toggleMenu"
        aria-label="Toggle menu"
        :aria-expanded="isMenuOpen"
        aria-controls="main-nav"
        type="button"
      >
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>
  
      <ul id="main-nav" :class="{ 'is-open': isMenuOpen }">
        <li v-for="item in navItems" :key="item.to">
          <router-link
            :to="item.to"
            @click="closeMenu"
            :class="{ 'overview-link': item.isOverview }"
          >
            <span>{{ item.label }}</span>
            <i aria-hidden="true">{{ item.icon }}</i>
          </router-link>
        </li>
      </ul>
    </nav>
  </template>
  
  <style scoped>
  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 2rem;
    box-shadow: var(--shadow-sm);
    position: relative;
    z-index: 50;
    background-color: var(--nav-bg, white);
  }
  
  .logo {
    font-family: var(--font-family-secondary);
    color: var(--primary-color);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.5px;
    z-index: 51;
  }
  
  /* Hamburger Menu Button */
  .hamburger {
    display: none;
    flex-direction: column;
    justify-content: space-between;
    width: 30px;
    height: 21px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    z-index: 51;
  }
  
  .bar {
    width: 100%;
    height: 3px;
    background-color: var(--text-color);
    border-radius: 3px;
    transition: transform 0.3s ease, opacity 0.3s ease;
  }
  
  /* Hamburger Animation */
  .hamburger.open .bar:nth-child(1) {
    transform: translateY(9px) rotate(45deg);
  }
  .hamburger.open .bar:nth-child(2) {
    opacity: 0;
  }
  .hamburger.open .bar:nth-child(3) {
    transform: translateY(-9px) rotate(-45deg);
  }
  
  ul {
    display: flex;
    align-items: center;
    gap: 10px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  
  nav li {
    display: block;
  }
  
  nav a {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: var(--text-color);
  
    font-size: 0.9rem;
    font-family: var(--font-family-secondary);
    font-weight: 500;
  
    background-color: var(--background-color);
    border-radius: 8px;
    box-shadow: var(--shadow-sm);
    padding: 8px 16px;
  
    transition: transform 0.3s ease, background-color 0.3s ease, color 0.3s ease;
  }
  
  nav a:hover {
    background-color: var(--secondary-color);
    color: var(--background-color);
  }
  
  /* Active State */
  nav a.router-link-active:not(.overview-link),
  nav a.overview-link.router-link-exact-active {
    background-color: var(--primary-color);
    color: var(--background-color);
  }
  
  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .hamburger {
      display: flex;
    }
  
    ul {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      flex-direction: column;
      background-color: var(--nav-bg, white);
      box-shadow: var(--shadow-md);
      padding: 20px;
      gap: 15px;
  
      /* Hidden by default on mobile */
      opacity: 0;
      visibility: hidden;
      transform: translateY(-10px);
      transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;
      z-index: 49;
    }
  
    ul.is-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  
    nav li {
      width: 100%;
    }
  
    nav a {
      justify-content: center;
      width: 100%;
      padding: 12px;
    }
  }
  </style>
  