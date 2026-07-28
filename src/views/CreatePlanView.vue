<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlansStore } from '@/stores/plans.store'
import { useAuthStore } from '@/stores/auth.store'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PayScheduleForm from '@/components/budget/PayScheduleForm.vue'

const plansStore = usePlansStore()
const authStore = useAuthStore()
const router = useRouter()

const step = ref<1 | 2>(1)
const name = ref('')
const createdPlanId = ref<string | null>(null)

const { loading, error, run } = useAsyncAction(async () => {
  if (!name.value.trim()) return
  createdPlanId.value = await plansStore.createIndividualPlan(name.value.trim())
  step.value = 2
})

function finish() {
  router.push('/')
}
</script>

<template>
  <div class="container">
    <router-link to="/" class="button-link back-link">← Tilbake til oversikt</router-link>

    <div class="page-header">
      <h1>Ny individuell plan</h1>
      <p class="card-subtitle">Steg {{ step }} av 2</p>
    </div>

    <section v-if="step === 1" class="card">
      <h2>Navn på planen</h2>
      <form class="form" @submit.prevent="run()">
        <label class="form-field">
          Navn
          <input
            v-model="name"
            type="text"
            placeholder="F.eks. Sparing til bil"
            required
            autofocus
          />
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button type="submit" class="button-primary" :disabled="loading">
          {{ loading ? 'Oppretter …' : 'Neste' }}
        </button>
      </form>
    </section>

    <section v-else class="card">
      <h2>Sett lønningsdag</h2>
      <p class="card-subtitle">
        Hvilken dag i måneden får du lønn? Dette brukes til å regne budsjettperioden din fra
        lønningsdag til lønningsdag.
      </p>
      <PayScheduleForm
        v-if="createdPlanId && authStore.user"
        :plan-id="createdPlanId"
        :profile-id="authStore.user.id"
        @saved="finish"
      />
      <button type="button" class="button-link wizard-skip" @click="finish">
        Hopp over, sett den senere
      </button>
    </section>
  </div>
</template>

<style scoped>
.wizard-skip {
  display: block;
  margin-top: var(--space-3);
}
</style>
