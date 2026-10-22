<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useCelebrationStore } from '@/stores/celebration.store'

const DISPLAY_MS = 4500
const CONFETTI_COUNT = 40
// Existing palette only, same as the rest of the app's color.
const CONFETTI_COLORS = [
  'var(--color-primary)',
  'var(--color-primary-hover)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
]

interface ConfettiPiece {
  left: number
  drift: number
  size: number
  delay: number
  duration: number
  color: string
}

function makeConfetti(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
    left: Math.random() * 100,
    drift: (Math.random() - 0.5) * 160,
    size: 6 + Math.random() * 6,
    delay: Math.random() * 0.5,
    duration: 1.8 + Math.random() * 1.4,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length]!,
  }))
}

const celebrationStore = useCelebrationStore()
const confetti = ref<ConfettiPiece[]>([])
let hideTimer: ReturnType<typeof setTimeout> | undefined

// Fresh confetti for each celebration in the queue, and a timer so it
// clears itself if nobody taps it away.
watch(
  () => celebrationStore.current?.id,
  (id) => {
    clearTimeout(hideTimer)
    if (id === undefined) return
    confetti.value = makeConfetti()
    hideTimer = setTimeout(() => celebrationStore.dismiss(), DISPLAY_MS)
  },
)

onBeforeUnmount(() => clearTimeout(hideTimer))
</script>

<template>
  <!-- Mounted even when empty, so screen readers announce what appears. -->
  <div class="celebration-region" role="status" aria-live="polite">
    <Transition name="celebration">
      <div
        v-if="celebrationStore.current"
        :key="celebrationStore.current.id"
        class="celebration"
        @click="celebrationStore.dismiss()"
      >
        <div class="celebration-confetti" aria-hidden="true">
          <span
            v-for="(piece, index) in confetti"
            :key="index"
            class="celebration-confetti-piece"
            :style="{
              left: `${piece.left}%`,
              width: `${piece.size}px`,
              height: `${piece.size * 0.45}px`,
              background: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              '--drift': `${piece.drift}px`,
            }"
          />
        </div>

        <div class="celebration-card">
          <span class="celebration-icon" aria-hidden="true">{{
            celebrationStore.current.icon
          }}</span>
          <p class="celebration-title">{{ celebrationStore.current.title }}</p>
          <p class="celebration-message">{{ celebrationStore.current.message }}</p>
          <p class="celebration-hint">Trykk for å lukke</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Above the toast (110) and sheets (100): a celebration can follow
   straight on from saving a form that's still sliding away. */
.celebration-region {
  position: relative;
  z-index: 120;
}

.celebration {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(17, 12, 34, 0.25);
  cursor: pointer;
}

.celebration-confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.celebration-confetti-piece {
  position: absolute;
  top: -16px;
  border-radius: 2px;
  animation-name: confetti-fall;
  animation-timing-function: ease-in;
  animation-fill-mode: both;
}

@keyframes confetti-fall {
  from {
    transform: translate3d(0, 0, 0) rotate(0deg);
    opacity: 1;
  }
  to {
    transform: translate3d(var(--drift), 105vh, 0) rotate(720deg);
    opacity: 0.7;
  }
}

.celebration-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  width: 100%;
  max-width: 320px;
  padding: var(--space-5) var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  background: var(--glass-bg-strong);
  backdrop-filter: blur(var(--blur-glass));
  -webkit-backdrop-filter: blur(var(--blur-glass));
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.celebration-icon {
  font-size: 3rem;
  line-height: 1.2;
}

.celebration-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
}

.celebration-message {
  margin: 0;
  color: var(--color-text-muted);
}

.celebration-hint {
  margin: var(--space-2) 0 0;
  font-size: 0.75rem;
  color: var(--color-text-subtle);
}

.celebration-enter-active,
.celebration-leave-active {
  transition: opacity 0.25s ease;
}

.celebration-enter-active .celebration-card {
  animation: celebration-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.celebration-enter-from,
.celebration-leave-to {
  opacity: 0;
}

@keyframes celebration-pop {
  from {
    transform: scale(0.6);
  }
  to {
    transform: scale(1);
  }
}
</style>
