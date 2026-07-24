import { supabase } from '@/lib/supabase'

export interface CreateRecurringCostInput {
  planId: string
  categoryId: string
  name: string
  amount: number | null
  isVariable: boolean
  createdBy: string
}

export interface UpdateRecurringCostInput {
  name?: string
  categoryId?: string
  amount?: number | null
  isVariable?: boolean
}

export const recurringCostsService = {
  async listByPlan(planId: string) {
    const { data, error } = await supabase
      .from('recurring_costs')
      .select('*')
      .eq('plan_id', planId)
      .eq('active', true)
      .order('name')
    if (error) throw error
    return data
  },

  async create(input: CreateRecurringCostInput) {
    const { data, error } = await supabase
      .from('recurring_costs')
      .insert({
        plan_id: input.planId,
        category_id: input.categoryId,
        name: input.name,
        amount: input.amount,
        is_variable: input.isVariable,
        created_by: input.createdBy,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, changes: UpdateRecurringCostInput) {
    const { data, error } = await supabase
      .from('recurring_costs')
      .update({
        name: changes.name,
        category_id: changes.categoryId,
        amount: changes.amount,
        is_variable: changes.isVariable,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Soft-disable rather than delete, so past budget calculations that
  // referenced this cost stay intact.
  async deactivate(id: string) {
    const { error } = await supabase.from('recurring_costs').update({ active: false }).eq('id', id)
    if (error) throw error
  },
}
