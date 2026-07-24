import { supabase } from '@/lib/supabase'

export const profilesService = {
  async getById(id: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async listByIds(ids: string[]) {
    if (ids.length === 0) return []
    const { data, error } = await supabase.from('profiles').select('*').in('id', ids)
    if (error) throw error
    return data
  },
}
