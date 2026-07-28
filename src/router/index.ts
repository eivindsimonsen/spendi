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
  // Vue Router keeps the scroll position across navigations by default --
  // reset to the top on every new route, except browser back/forward,
  // where restoring where the user was is the expected behavior.
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'overview',
      component: () => import('@/views/OverviewView.vue'),
    },
    {
      path: '/income',
      name: 'income',
      component: () => import('@/views/IncomeView.vue'),
    },
    {
      path: '/budget',
      name: 'budget',
      component: () => import('@/views/BudgetView.vue'),
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
      path: '/statistics',
      name: 'statistics',
      component: () => import('@/views/StatisticsView.vue'),
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
      path: '/plans/new',
      name: 'create-plan',
      component: () => import('@/views/CreatePlanView.vue'),
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
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
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
