import { supabase } from '@/lib/supabase'

export interface PayScheduleInput {
  planId: string
  payday: number
}

export const incomeProfilesService = {
  async getByPlan(planId: string) {
    const { data, error } = await supabase
      .from('income_profiles')
      .select('*')
      .eq('plan_id', planId)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async upsert(input: PayScheduleInput) {
    const { data, error } = await supabase
      .from('income_profiles')
      .upsert(
        {
          plan_id: input.planId,
          payday: input.payday,
        },
        { onConflict: 'plan_id' },
      )
      .select()
      .single()
    if (error) throw error
    return data
  },
}
