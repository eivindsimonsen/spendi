<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'

const email = ref('')
const password = ref('')

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const { loading, error, run } = useAsyncAction(async () => {
  await auth.signIn({ email: email.value, password: password.value })
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await router.push(redirect)
})
</script>

<template>
  <div class="auth-page">
    <h1>Logg inn</h1>
    <form class="form" @submit.prevent="run()">
      <label class="form-field">
        E-post
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label class="form-field">
        Passord
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <button type="submit" class="button-primary" :disabled="loading">
        {{ loading ? 'Logger inn …' : 'Logg inn' }}
      </button>
    </form>
    <p class="auth-switch">Ny her? <router-link to="/sign-up">Opprett konto</router-link></p>
  </div>
</template>
