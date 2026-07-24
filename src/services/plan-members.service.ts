import { supabase } from '@/lib/supabase'

export type PlanMemberStatus = 'pending' | 'accepted' | 'declined'

export const planMembersService = {
  async listForPlan(planId: string) {
    const { data, error } = await supabase.from('plan_members').select('*').eq('plan_id', planId)
    if (error) throw error
    return data
  },

  // Explicitly filtered to `profileId` rather than relying on RLS alone --
  // RLS also allows a plan's other members to read this table, which
  // would return more than "invites addressed to me".
  async listPendingInvitesForProfile(profileId: string) {
    const { data, error } = await supabase
      .from('plan_members')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'pending')
    if (error) throw error
    return data
  },

  async respond(id: string, status: PlanMemberStatus) {
    const { data, error } = await supabase
      .from('plan_members')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
