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
  const recurringCosts = ref<RecurringCost[]>([])

  // Skips for whichever period was last loaded via loadSkipsForPeriod --
  // only one period's worth is kept at a time (the current one).
  const skippedThisPeriod = ref<RecurringCostSkip[]>([])

  async function load(planId: string) {
    recurringCosts.value = await recurringCostsService.listByPlan(planId)
  }

  async function loadSkipsForPeriod(periodStart: string) {
    const ids = recurringCosts.value.map((cost) => cost.id)
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

  async function create(input: CreateRecurringCostInput) {
    const created = await recurringCostsService.create(input)
    recurringCosts.value = [...recurringCosts.value, created]
    return created
  }

  async function deactivate(id: string) {
    await recurringCostsService.deactivate(id)
    recurringCosts.value = recurringCosts.value.filter((cost) => cost.id !== id)
  }

  return {
    recurringCosts,
    skippedThisPeriod,
    load,
    loadSkipsForPeriod,
    isSkipped,
    skipForPeriod,
    unskipForPeriod,
    create,
    deactivate,
  }
})
