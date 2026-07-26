import { supabase } from '@/lib/supabase'

export const plansService = {
  // RLS already scopes results to plans the current user is a member of.
  async listMine() {
    const { data, error } = await supabase.from('plans').select('*').order('created_at')
    if (error) throw error
    return data
  },

  async getByIds(ids: string[]) {
    if (ids.length === 0) return []
    const { data, error } = await supabase.from('plans').select('*').in('id', ids)
    if (error) throw error
    return data
  },

  // Returns the new shared plan's id. See supabase/migrations for what
  // the propose_shared_plan function does (creates the plan, adds the
  // caller as accepted/owner and the invitee as pending).
  async proposeSharedPlan(name: string, inviteeId: string) {
    const { data, error } = await supabase.rpc('propose_shared_plan', {
      p_name: name,
      p_invitee_id: inviteeId,
    })
    if (error) throw error
    return data
  },

  // Returns the new individual plan's id.
  async createIndividual(name: string) {
    const { data, error } = await supabase.rpc('create_individual_plan', { p_name: name })
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (error) throw error
  },
}
