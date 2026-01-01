import { createRouter, createWebHistory } from 'vue-router';
import Overview from '../views/Overview.vue';
import Household from '../views/Household.vue';
import Login from '../views/Login.vue';
import User from '../views/User.vue';

const routes = [
  {
    path: '/',
    name: 'Oversikt',
    component: Overview,
    meta: { requiresAuth: true }
  },
  {
    path: '/household',
    name: 'Husholdning',
    component: Household,
    meta: { requiresAuth: true }
  },
  {
    path: '/user',
    name: 'Bruker',
    component: User,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;

