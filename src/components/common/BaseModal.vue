<script setup lang="ts">
defineProps<{ modelValue: boolean; title?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-backdrop" @click.self="close">
        <Transition name="modal-slide">
          <div v-if="modelValue" class="modal-sheet" role="dialog" aria-modal="true">
            <div class="modal-header">
              <h2 v-if="title" class="modal-title">{{ title }}</h2>
              <button type="button" class="modal-close" aria-label="Lukk" @click="close">✕</button>
            </div>
            <div class="modal-body">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 12, 34, 0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-sheet {
  position: relative;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(var(--blur-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass));
  border: 1px solid var(--glass-border);
  border-bottom: none;
  width: 100%;
  max-width: 480px;
  max-height: 85dvh;
  overflow-y: auto;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--space-5);
  box-shadow: var(--shadow-lg);
}

.modal-sheet::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--glass-highlight), transparent);
}

@media (min-width: 640px) {
  .modal-backdrop {
    align-items: center;
  }

  .modal-sheet {
    border-radius: var(--radius-xl);
    border-bottom: 1px solid var(--glass-border);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.modal-title {
  font-size: 1.1rem;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--color-text-muted);
  padding: var(--space-1);
  line-height: 1;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: transform 0.25s ease;
}

.modal-slide-enter-from,
.modal-slide-leave-to {
  transform: translateY(100%);
}
</style>
