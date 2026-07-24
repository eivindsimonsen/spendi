<script setup lang="ts">
defineProps<{ label?: string }>()
const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="info-icon"
    :aria-label="label ?? 'Vis forklaring'"
    @click="emit('click')"
  >
    ⓘ
  </button>
</template>

<style scoped>
.info-icon {
  background: none;
  border: none;
  color: var(--color-text-subtle);
  font-size: 0.95rem;
  padding: 0 var(--space-1);
  line-height: 1;
}

.info-icon:hover {
  color: var(--color-primary);
}
</style>
