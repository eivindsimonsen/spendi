import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  recurringCostsService,
  type CreateRecurringCostInput,
  type UpdateRecurringCostInput,
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

  // Both lists are patched: a cost of yours belongs to every plan you're
  // in, the active one included, and it can be added from the tab bar's
  // "+" sheet on any page -- the budget on screen has to pick it up
  // without waiting for a view to remount and refetch `planCosts`.
  async function create(input: CreateRecurringCostInput) {
    const created = await recurringCostsService.create(input)
    myCosts.value = [...myCosts.value, created]
    planCosts.value = [...planCosts.value, created]
    return created
  }

  async function update(id: string, changes: UpdateRecurringCostInput) {
    const updated = await recurringCostsService.update(id, changes)
    myCosts.value = myCosts.value.map((cost) => (cost.id === id ? updated : cost))
    planCosts.value = planCosts.value.map((cost) => (cost.id === id ? updated : cost))
    return updated
  }

  async function deactivate(id: string) {
    await recurringCostsService.deactivate(id)
    myCosts.value = myCosts.value.filter((cost) => cost.id !== id)
    planCosts.value = planCosts.value.filter((cost) => cost.id !== id)
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
    update,
    deactivate,
  }
})
