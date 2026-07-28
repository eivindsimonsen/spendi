import { supabase } from '@/lib/supabase'

export interface CreateCategoryInput {
  planId: string
  name: string
  icon?: string
  color?: string
}

export const categoriesService = {
  // System categories plus any custom categories belonging to this plan.
  async listVisible(planId: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`is_system.eq.true,plan_id.eq.${planId}`)
      .order('name')
    if (error) throw error
    return data
  },

  async createCustom(input: CreateCategoryInput) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        plan_id: input.planId,
        is_system: false,
        name: input.name,
        icon: input.icon,
        color: input.color,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateCustom(id: string, changes: { name?: string; icon?: string }) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: changes.name, icon: changes.icon })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteCustom(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },
}
