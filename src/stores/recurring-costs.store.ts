import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  recurringCostsService,
  type CreateRecurringCostInput,
  type UpdateRecurringCostInput,
} from '@/services/recurring-costs.service'
import type { Database } from '@/types/database.types'

type RecurringCost = Database['public']['Tables']['recurring_costs']['Row']

export const useRecurringCostsStore = defineStore('recurringCosts', () => {
  const recurringCosts = ref<RecurringCost[]>([])
  const loaded = ref(false)

  async function load(planId: string) {
    recurringCosts.value = await recurringCostsService.listByPlan(planId)
    loaded.value = true
  }

  async function create(input: CreateRecurringCostInput) {
    const created = await recurringCostsService.create(input)
    recurringCosts.value = [...recurringCosts.value, created]
    return created
  }

  async function update(id: string, changes: UpdateRecurringCostInput) {
    const updated = await recurringCostsService.update(id, changes)
    recurringCosts.value = recurringCosts.value.map((cost) => (cost.id === id ? updated : cost))
    return updated
  }

  async function deactivate(id: string) {
    await recurringCostsService.deactivate(id)
    recurringCosts.value = recurringCosts.value.filter((cost) => cost.id !== id)
  }

  return { recurringCosts, loaded, load, create, update, deactivate }
})
