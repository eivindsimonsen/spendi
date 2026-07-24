import { supabase } from '@/lib/supabase'

export const friendshipsService = {
  // Rows are only ever created via the redeem_invite_code RPC.
  async listMine() {
    const { data, error } = await supabase.from('friendships').select('*')
    if (error) throw error
    return data
  },
}
