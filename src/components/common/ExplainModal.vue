<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import type { CalculationResult } from '@/core/types/calculation-result'
import { formatCurrencyNOK } from '@/core/format'

defineProps<{ modelValue: boolean; result: CalculationResult<number> | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function formatValue(value: number | string, unit?: string): string {
  if (typeof value === 'number' && unit === 'kr') return formatCurrencyNOK(value)
  if (typeof value === 'number') return unit ? `${value} ${unit}` : String(value)
  return value
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Hvordan ble dette regnet ut?"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="result">
      <p class="explain-summary">{{ result.summary }}</p>
      <div class="explain-steps">
        <div v-for="(step, index) in result.steps" :key="index" class="list-row-block">
          <p class="explain-step-label">{{ step.label }}</p>
          <p v-if="step.formula" class="explain-step-formula">{{ step.formula }}</p>
          <ul v-if="step.inputs.length" class="explain-step-inputs">
            <li v-for="(input, inputIndex) in step.inputs" :key="inputIndex">
              {{ input.label }}: {{ formatValue(input.value, input.unit) }}
            </li>
          </ul>
          <p class="explain-step-result">= {{ formatCurrencyNOK(step.result) }}</p>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.explain-summary {
  color: var(--color-text-muted);
  margin: 0 0 var(--space-4);
}

.explain-step-label {
  font-weight: 600;
  margin: 0 0 var(--space-1);
}

.explain-step-formula {
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-2);
}

.explain-step-inputs {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-2);
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.explain-step-result {
  font-weight: 600;
  margin: 0;
}
</style>
