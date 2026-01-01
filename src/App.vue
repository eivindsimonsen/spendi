<script setup lang="ts">
// imports
import { ref } from 'vue'

// types
interface FeatureCard {
  id: number
  title: string
  description: string
  icon: string
}

// state
const cards = ref<FeatureCard[]>([
  {
    id: 1,
    title: 'Analytics',
    description: 'Track your spending habits with detailed charts and daily breakdowns.',
    icon: '📊'
  },
  {
    id: 2,
    title: 'Budgeting',
    description: 'Set monthly limits for different categories to save more effectively.',
    icon: '💰'
  },
  {
    id: 3,
    title: 'Savings',
    description: 'Create goals and watch your savings grow over time automatically.',
    icon: '🐷'
  },
  {
    id: 4,
    title: 'Reports',
    description: 'Export your financial data to PDF or Excel for external analysis.',
    icon: '📑'
  }
])

// methods
const handleCardClick = (id: number) => {
  console.log('Card clicked:', id)
}
</script>

<template>
  <div class="app-container">
    <header class="header">
      <div class="header-content">
        <h1>Spendi</h1>
        <p>Smart finance tracking for everyone</p>
      </div>
    </header>

    <main class="main-content">
      <section class="cards-grid">
        <article 
          v-for="card in cards" 
          :key="card.id" 
          class="card"
          @click="handleCardClick(card.id)"
        >
          <div class="card-icon">{{ card.icon }}</div>
          <h2 class="card-title">{{ card.title }}</h2>
          <p class="card-description">{{ card.description }}</p>
        </article>
      </section>
    </main>

    <footer class="footer">
      <p>&copy; {{ new Date().getFullYear() }} Spendi Inc. All rights reserved.</p>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  background-color: #f8f9fa;
}

.header {
  background-color: #ffffff;
  padding: 2rem 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  text-align: center;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #42b983;
}

.header p {
  color: #6c757d;
  font-size: 1.1rem;
}

.main-content {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 1rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  border: 1px solid #e9ecef;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0,0,0,0.1);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  color: #2c3e50;
}

.card-description {
  line-height: 1.6;
  color: #6c757d;
}

.footer {
  background-color: #343a40;
  color: #ffffff;
  padding: 2rem;
  text-align: center;
  margin-top: auto;
}
</style>
