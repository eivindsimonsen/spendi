import { supabase } from '@/lib/supabase'

export interface CreateSkipInput {
  recurringCostId: string
  periodStart: string
}

export const recurringCostSkipsService = {
  // All skips across a plan's recurring costs for one specific period.
  async listForPeriod(recurringCostIds: string[], periodStart: string) {
    if (!recurringCostIds.length) return []
    const { data, error } = await supabase
      .from('recurring_cost_skips')
      .select('*')
      .in('recurring_cost_id', recurringCostIds)
      .eq('period_start', periodStart)
    if (error) throw error
    return data
  },

  async create(input: CreateSkipInput) {
    const { data, error } = await supabase
      .from('recurring_cost_skips')
      .insert({ recurring_cost_id: input.recurringCostId, period_start: input.periodStart })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('recurring_cost_skips').delete().eq('id', id)
    if (error) throw error
  },
}
