<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlansStore } from '@/stores/plans.store'
import { useAsyncAction } from '@/composables/useAsyncAction'

const plansStore = usePlansStore()
const router = useRouter()

const name = ref('')

const { loading, error, run } = useAsyncAction(async () => {
  if (!name.value.trim()) return
  await plansStore.createIndividualPlan(name.value.trim())
  await router.push('/')
})
</script>

<template>
  <div class="container">
    <router-link to="/" class="button-link back-link">← Tilbake til oversikt</router-link>

    <div class="page-header">
      <h1>Ny individuell plan</h1>
    </div>

    <section class="card">
      <form class="form" @submit.prevent="run()">
        <label class="form-field">
          Navn på planen
          <input v-model="name" type="text" placeholder="F.eks. Sparing til bil" required autofocus />
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button type="submit" class="button-primary" :disabled="loading">
          {{ loading ? 'Oppretter …' : 'Opprett plan' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: var(--space-4);
  padding: 0;
}
</style>
