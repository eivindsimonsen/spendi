import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePlansStore } from '@/stores/plans.store'

// Every view that needs "which plan am I looking at" uses this instead of
// repeating the load-on-mount boilerplate. Returns whichever plan is
// currently active -- see plans.store.ts for how that's chosen/switched.
export function useCurrentPlan() {
  const store = usePlansStore()
  const { activePlan, loaded } = storeToRefs(store)

  onMounted(() => {
    void store.loadMyPlans()
  })

  return { currentPlan: activePlan, loaded }
}
