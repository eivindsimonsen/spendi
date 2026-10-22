import { supabase } from '@/lib/supabase'
import type { SavingsGoalTheme } from '@/types/database.types'

export interface CreateSavingsGoalInput {
  planId: string
  name: string
  targetAmount: number
  targetDate: string
  theme: SavingsGoalTheme
}

// The plan is fixed once created: moving a goal would drag its
// contribution history (possibly a partner's) into another plan with it.
export type UpdateSavingsGoalInput = Omit<CreateSavingsGoalInput, 'planId'>

export const savingsGoalsService = {
  async listByPlan(planId: string) {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('plan_id', planId)
      .order('target_date')
    if (error) throw error
    return data
  },

  async create(input: CreateSavingsGoalInput) {
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        plan_id: input.planId,
        name: input.name,
        target_amount: input.targetAmount,
        target_date: input.targetDate,
        theme: input.theme,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, changes: UpdateSavingsGoalInput) {
    const { data, error } = await supabase
      .from('savings_goals')
      .update({
        name: changes.name,
        target_amount: changes.targetAmount,
        target_date: changes.targetDate,
        theme: changes.theme,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) throw error
  },
}
