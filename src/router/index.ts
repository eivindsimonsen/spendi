import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    // Defaults to true when omitted — see router/guards.ts.
    requiresAuth?: boolean
  }
}

// Route table grows through the phased build-out (the real feature
// routes land in Phases 2-5).
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'overview',
      component: () => import('@/views/OverviewView.vue'),
    },
    {
      path: '/recurring-costs',
      name: 'recurring-costs',
      component: () => import('@/views/RecurringCostsView.vue'),
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
    },
    {
      path: '/friends',
      name: 'friends',
      component: () => import('@/views/FriendsView.vue'),
    },
    {
      path: '/savings',
      name: 'savings',
      component: () => import('@/views/SavingsView.vue'),
    },
    {
      path: '/add-expense',
      name: 'add-expense',
      component: () => import('@/views/AddExpenseView.vue'),
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('@/views/AccountView.vue'),
    },
    {
      path: '/sign-in',
      name: 'sign-in',
      component: () => import('@/views/auth/SignInView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/sign-up',
      name: 'sign-up',
      component: () => import('@/views/auth/SignUpView.vue'),
      meta: { requiresAuth: false },
    },
  ],
})

export default router
