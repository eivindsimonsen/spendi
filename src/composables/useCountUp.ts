import { onBeforeUnmount, ref, watch } from 'vue'

const DURATION_MS = 800

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3)
}

// A number that counts up to `source` instead of appearing at once -- from
// zero when first shown, then from wherever it was on each change. Purely
// for show: the real value is always `source` itself, this only animates
// the way there. Skipped under "reduce motion".
export function useCountUp(source: () => number) {
  const displayed = ref(0)
  let frame: number | undefined

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  watch(
    source,
    (target) => {
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (reduceMotion) {
        displayed.value = target
        return
      }

      const from = displayed.value
      const startedAt = performance.now()
      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / DURATION_MS)
        displayed.value = from + (target - from) * easeOutCubic(progress)
        frame = progress < 1 ? requestAnimationFrame(step) : undefined
      }
      frame = requestAnimationFrame(step)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (frame !== undefined) cancelAnimationFrame(frame)
  })

  return displayed
}
