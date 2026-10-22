<script setup lang="ts">
import { computed, ref } from 'vue'
import InfoIcon from './InfoIcon.vue'
import ExplainModal from './ExplainModal.vue'
import type { CalculationResult } from '@/core/types/calculation-result'
import { formatCurrencyNOK } from '@/core/format'
import { useCountUp } from '@/composables/useCountUp'

// `animate` counts the number up when it's first shown -- for the few
// headline figures meant to feel rewarding, not every value in a list.
const props = defineProps<{ result: CalculationResult<number>; animate?: boolean }>()

const isOpen = ref(false)

const shownValue = props.animate
  ? useCountUp(() => props.result.value)
  : computed(() => props.result.value)

const formatted = computed(() =>
  props.result.unit
    ? `${Math.round(shownValue.value)} ${props.result.unit}`
    : formatCurrencyNOK(shownValue.value),
)
</script>

<template>
  <span class="explainable-value">
    <span class="explainable-value-amount">{{ formatted }}</span>
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
