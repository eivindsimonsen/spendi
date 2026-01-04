import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'overview',
      component: () => import('../views/OverviewView.vue'),
    },
    {
      path: '/budgets',
      name: 'budgets',
      component: () => import('../views/BudgetsView.vue'),
    },
    {
      path: '/household',
      name: 'household',
      component: () => import('../views/HouseholdView.vue'),
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('../views/AccountView.vue'),
    },
  ],
})

export default router
