<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

// Mock login function
const handleLogin = () => {
  // In a real app, this would set auth state
  localStorage.setItem('isAuthenticated', 'true');
  router.push('/');
};
</script>

<template>
  <div class="login-container">
    <h2>Login</h2>
    <p>Please log in to continue.</p>
    <button @click="handleLogin" class="login-btn">Log In</button>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
}

.login-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>

