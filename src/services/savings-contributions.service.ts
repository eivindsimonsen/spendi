import { supabase } from '@/lib/supabase'

export interface CreateContributionInput {
  goalId: string
  amount: number
  occurredOn: string
  note?: string
  createdBy: string
}

export const savingsContributionsService = {
  async listByGoal(goalId: string) {
    const { data, error } = await supabase
      .from('savings_contributions')
      .select('*')
      .eq('goal_id', goalId)
      .order('occurred_on', { ascending: false })
    if (error) throw error
    return data
  },

  async create(input: CreateContributionInput) {
    const { data, error } = await supabase
      .from('savings_contributions')
      .insert({
        goal_id: input.goalId,
        amount: input.amount,
        occurred_on: input.occurredOn,
        note: input.note,
        created_by: input.createdBy,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
