import { supabase } from '@/lib/supabase'

export interface PayScheduleInput {
  planId: string
  profileId: string
  payday: number
}

// Payday is per (plan, profile) -- each plan member sets their own, since
// a couple sharing a plan can be paid on different days.
export const incomeProfilesService = {
  async getMine(planId: string, profileId: string) {
    const { data, error } = await supabase
      .from('income_profiles')
      .select('*')
      .eq('plan_id', planId)
      .eq('profile_id', profileId)
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
          profile_id: input.profileId,
          payday: input.payday,
        },
        { onConflict: 'plan_id,profile_id' },
      )
      .select()
      .single()
    if (error) throw error
    return data
  },
}
