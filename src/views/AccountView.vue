<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

async function handleSignOut() {
  await auth.signOut()
  await router.push('/sign-in')
}
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>Konto</h1>
    </div>

    <section class="card">
      <p v-if="auth.profile">Innlogget som {{ auth.profile.display_name }}.</p>
    </section>

    <section class="card">
      <router-link to="/friends" class="account-link">👥 Venner</router-link>
    </section>

    <section class="card">
      <button type="button" class="button-primary" @click="handleSignOut">Logg ut</button>
    </section>
  </div>
</template>
