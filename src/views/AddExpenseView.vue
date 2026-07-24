<script setup lang="ts">
import { ref } from 'vue'
import { useCurrentPlan } from '@/composables/useCurrentPlan'
import AddExpenseForm from '@/components/expense/AddExpenseForm.vue'

const { currentPlan } = useCurrentPlan()
const showConfirmation = ref(false)

function handleCreated() {
  showConfirmation.value = true
  setTimeout(() => {
    showConfirmation.value = false
  }, 3000)
}
</script>

<template>
  <div class="container">
    <div class="page-header">
      <h1>Uforutsett utgift</h1>
    </div>

    <section class="card">
      <p v-if="showConfirmation" class="expense-confirmation">Utgiften ble lagt til!</p>
      <AddExpenseForm v-if="currentPlan" :plan-id="currentPlan.id" @created="handleCreated" />
    </section>
  </div>
</template>

<style scoped>
.expense-confirmation {
  color: var(--color-success);
  font-weight: 600;
}
</style>
