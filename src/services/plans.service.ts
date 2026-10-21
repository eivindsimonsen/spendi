import { supabase } from '@/lib/supabase'
import type { BudgetModelId } from '@/core/discretionary-split'

export const plansService = {
  // Only plans you've accepted. RLS alone isn't enough here: its select
  // policy also lets you read a plan you're merely invited to (or have
  // declined), so an invite can show the plan's name -- but nothing in
  // such a plan is readable or writable until you accept it.
  async listMine(profileId: string) {
    const { data, error } = await supabase
      .from('plans')
      .select('*, plan_members!inner(status)')
      .eq('plan_members.profile_id', profileId)
      .eq('plan_members.status', 'accepted')
      .order('created_at')
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

  async updateBudgetModel(id: string, budgetModel: BudgetModelId) {
    const { data, error } = await supabase
      .from('plans')
      .update({ budget_model: budgetModel })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
