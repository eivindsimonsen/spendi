import { watch, type Ref } from 'vue'
import { useCurrentPlan } from './useCurrentPlan'
import type { Database } from '@/types/database.types'

type Plan = Database['public']['Tables']['plans']['Row']

// Re-runs `loader` with the active plan's id whenever it changes,
// including on initial mount -- this exact shape (the null guard,
// `immediate: true`) was repeated across nearly every view in this app.
//
// Pass an already-resolved `currentPlan` ref when the caller also needs
// it directly (e.g. in its own template), so the active plan isn't
// re-derived a second time -- each `useCurrentPlan()` call triggers its
// own `plans` fetch on mount, so calling it redundantly across a page's
// composables was causing duplicate network requests.
export function useLoadOnActivePlan(
  loader: (planId: string) => Promise<unknown>,
  providedCurrentPlan?: Ref<Plan | null>,
) {
  const currentPlan = providedCurrentPlan ?? useCurrentPlan().currentPlan

  watch(
    currentPlan,
    async (plan) => {
      if (!plan) return
      await loader(plan.id)
    },
    { immediate: true },
  )

  return { currentPlan }
}
