<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'

const displayName = ref('')
const email = ref('')
const password = ref('')
// Supabase requires email confirmation by default, so signUp() often
// returns without a session — show a "check your email" state instead
// of assuming an immediate login.
const awaitingEmailConfirmation = ref(false)

const auth = useAuthStore()
const router = useRouter()

const { loading, error, run } = useAsyncAction(async () => {
  const result = await auth.signUp({
    displayName: displayName.value,
    email: email.value,
    password: password.value,
  })

  if (result.session) {
    await router.push('/')
  } else {
    awaitingEmailConfirmation.value = true
  }
})
</script>

<template>
  <div class="auth-page">
    <template v-if="awaitingEmailConfirmation">
      <h1>Sjekk e-posten din</h1>
      <p>Vi har sendt en bekreftelseslenke til {{ email }}. Bekreft e-posten for å logge inn.</p>
    </template>
    <template v-else>
      <h1>Opprett konto</h1>
      <form class="form" @submit.prevent="run()">
        <label class="form-field">
          Navn
          <input v-model="displayName" type="text" autocomplete="name" required />
        </label>
        <label class="form-field">
          E-post
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <label class="form-field">
          Passord
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="6"
            required
          />
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button type="submit" class="button-primary" :disabled="loading">
          {{ loading ? 'Oppretter konto …' : 'Opprett konto' }}
        </button>
      </form>
      <p class="auth-switch">
        Har du allerede en konto? <router-link to="/sign-in">Logg inn</router-link>
      </p>
    </template>
  </div>
</template>
