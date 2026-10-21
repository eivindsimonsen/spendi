import { supabase } from '@/lib/supabase'

export interface CreateRecurringCostInput {
  ownerId: string
  categoryId: string
  name: string
  amount: number | null
  isVariable: boolean
}

// The owner is fixed once created -- RLS only lets you edit your own
// costs anyway, so there's nothing to hand them over to.
export type UpdateRecurringCostInput = Omit<CreateRecurringCostInput, 'ownerId'>

export const recurringCostsService = {
  // A recurring cost belongs to a person, not a plan: this is the one
  // list you maintain, and it applies to every plan you're a member of.
  async listMine(ownerId: string) {
    const { data, error } = await supabase
      .from('recurring_costs')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('active', true)
      .order('name')
    if (error) throw error
    return data
  },

  // The costs that apply to one plan: every accepted member's own list,
  // merged. Goes through an RPC rather than a client-side join, so the
  // "whose costs count here" rule lives next to the RLS policies that
  // enforce it (see supabase/migrations).
  async listForPlan(planId: string) {
    const { data, error } = await supabase.rpc('list_plan_recurring_costs', {
      p_plan_id: planId,
    })
    if (error) throw error
    return data
  },

  async create(input: CreateRecurringCostInput) {
    const { data, error } = await supabase
      .from('recurring_costs')
      .insert({
        owner_id: input.ownerId,
        category_id: input.categoryId,
        name: input.name,
        amount: input.amount,
        is_variable: input.isVariable,
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
        category_id: changes.categoryId,
        name: changes.name,
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
