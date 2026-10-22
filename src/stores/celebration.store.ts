import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Celebration } from '@/core/types/celebration'

interface QueuedCelebration extends Celebration {
  id: number
}

// Confetti moments, shown one at a time by CelebrationOverlay.vue. Queued
// rather than replaced, unlike the toast: one contribution can pass a
// milestone and unlock a badge at once, and each deserves its moment.
export const useCelebrationStore = defineStore('celebration', () => {
  const queue = ref<QueuedCelebration[]>([])
  let nextId = 0

  const current = computed(() => queue.value[0] ?? null)

  function celebrate(celebration: Celebration) {
    queue.value = [...queue.value, { ...celebration, id: nextId++ }]
  }

  function dismiss() {
    queue.value = queue.value.slice(1)
  }

  return { current, celebrate, dismiss }
})
