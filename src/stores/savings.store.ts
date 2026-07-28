import { ref } from 'vue'
import { defineStore } from 'pinia'
import { savingsGoalsService, type CreateSavingsGoalInput } from '@/services/savings-goals.service'
import {
  savingsContributionsService,
  type CreateContributionInput,
} from '@/services/savings-contributions.service'
import type { Database } from '@/types/database.types'

type SavingsGoal = Database['public']['Tables']['savings_goals']['Row']
type SavingsContribution = Database['public']['Tables']['savings_contributions']['Row']

export const useSavingsStore = defineStore('savings', () => {
  const goals = ref<SavingsGoal[]>([])
  const contributionsByGoal = ref<Map<string, SavingsContribution[]>>(new Map())

  async function load(planId: string) {
    goals.value = await savingsGoalsService.listByPlan(planId)

    const entries = await Promise.all(
      goals.value.map(
        async (goal) => [goal.id, await savingsContributionsService.listByGoal(goal.id)] as const,
      ),
    )
    contributionsByGoal.value = new Map(entries)
  }

  function contributionsTotal(goalId: string): number {
    return (contributionsByGoal.value.get(goalId) ?? []).reduce((sum, c) => sum + c.amount, 0)
  }

  async function createGoal(input: CreateSavingsGoalInput) {
    const created = await savingsGoalsService.create(input)
    goals.value = [...goals.value, created]
    contributionsByGoal.value.set(created.id, [])
    return created
  }

  async function deleteGoal(id: string) {
    await savingsGoalsService.delete(id)
    goals.value = goals.value.filter((goal) => goal.id !== id)
    contributionsByGoal.value.delete(id)
  }

  async function addContribution(input: CreateContributionInput) {
    const created = await savingsContributionsService.create(input)
    const existing = contributionsByGoal.value.get(input.goalId) ?? []
    contributionsByGoal.value.set(input.goalId, [created, ...existing])
    return created
  }

  return {
    goals,
    contributionsByGoal,
    load,
    contributionsTotal,
    createGoal,
    deleteGoal,
    addContribution,
  }
})
