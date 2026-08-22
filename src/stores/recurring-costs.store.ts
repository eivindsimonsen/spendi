import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  recurringCostsService,
  type CreateRecurringCostInput,
} from '@/services/recurring-costs.service'
import { recurringCostSkipsService } from '@/services/recurring-cost-skips.service'
import type { Database } from '@/types/database.types'

type RecurringCost = Database['public']['Tables']['recurring_costs']['Row']
type RecurringCostSkip = Database['public']['Tables']['recurring_cost_skips']['Row']

export const useRecurringCostsStore = defineStore('recurringCosts', () => {
  // Two separate lists rather than one, because they answer two
  // different questions: `myCosts` is the personal list you edit on
  // Faste utgifter, `planCosts` is what the active plan's budget is
  // built from -- yours plus any plan partner's.
  const myCosts = ref<RecurringCost[]>([])
  const planCosts = ref<RecurringCost[]>([])

  // Skips for whichever period was last loaded via loadSkipsForPeriod --
  // only one period's worth is kept at a time (the current one).
  const skippedThisPeriod = ref<RecurringCostSkip[]>([])

  async function loadMine(ownerId: string) {
    myCosts.value = await recurringCostsService.listMine(ownerId)
  }

  async function loadForPlan(planId: string) {
    planCosts.value = await recurringCostsService.listForPlan(planId)
  }

  async function loadSkipsForPeriod(periodStart: string) {
    const ids = planCosts.value.map((cost) => cost.id)
    skippedThisPeriod.value = await recurringCostSkipsService.listForPeriod(ids, periodStart)
  }

  function isSkipped(recurringCostId: string): boolean {
    return skippedThisPeriod.value.some((skip) => skip.recurring_cost_id === recurringCostId)
  }

  async function skipForPeriod(recurringCostId: string, periodStart: string) {
    const created = await recurringCostSkipsService.create({ recurringCostId, periodStart })
    skippedThisPeriod.value = [...skippedThisPeriod.value, created]
  }

  async function unskipForPeriod(recurringCostId: string) {
    const skip = skippedThisPeriod.value.find((item) => item.recurring_cost_id === recurringCostId)
    if (!skip) return
    await recurringCostSkipsService.delete(skip.id)
    skippedThisPeriod.value = skippedThisPeriod.value.filter((item) => item.id !== skip.id)
  }

  // Only `myCosts` is patched here: adding or removing a cost happens on
  // Faste utgifter, and every view that reads `planCosts` refetches it
  // when it mounts, so there's no second copy to keep in sync.
  async function create(input: CreateRecurringCostInput) {
    const created = await recurringCostsService.create(input)
    myCosts.value = [...myCosts.value, created]
    return created
  }

  async function deactivate(id: string) {
    await recurringCostsService.deactivate(id)
    myCosts.value = myCosts.value.filter((cost) => cost.id !== id)
  }

  return {
    myCosts,
    planCosts,
    skippedThisPeriod,
    loadMine,
    loadForPlan,
    loadSkipsForPeriod,
    isSkipped,
    skipForPeriod,
    unskipForPeriod,
    create,
    deactivate,
  }
})
