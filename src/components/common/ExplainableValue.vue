<script setup lang="ts">
import { ref } from 'vue'
import InfoIcon from './InfoIcon.vue'
import ExplainModal from './ExplainModal.vue'
import type { CalculationResult } from '@/core/types/calculation-result'
import { formatCurrencyNOK } from '@/core/format'

const props = defineProps<{ result: CalculationResult<number> }>()

const isOpen = ref(false)
</script>

<template>
  <span class="explainable-value">
    <span class="explainable-value-amount">{{ formatCurrencyNOK(props.result.value) }}</span>
    <InfoIcon @click="isOpen = true" />
    <ExplainModal v-model="isOpen" :result="props.result" />
  </span>
</template>

<style scoped>
.explainable-value {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
</style>
