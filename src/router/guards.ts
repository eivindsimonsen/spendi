import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

// Routes opt out of the auth gate with `meta: { requiresAuth: false }`
// (sign-in/sign-up); everything else requires a session by default.
export function setupAuthGuard(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    if (!auth.initialized) {
      await auth.init()
    }

    const requiresAuth = to.meta.requiresAuth !== false

    if (requiresAuth && !auth.isAuthenticated) {
      return { name: 'sign-in', query: { redirect: to.fullPath } }
    }

    if (!requiresAuth && auth.isAuthenticated) {
      return { name: 'overview' }
    }

    return true
  })
}
