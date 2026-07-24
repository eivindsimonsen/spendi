import { customAlphabet } from 'nanoid'
import { supabase } from '@/lib/supabase'

// Excludes visually-ambiguous characters (0/O, 1/I/L) since this code is
// meant to be read aloud or typed in by hand.
const generateCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 8)

export const friendInvitesService = {
  async listMine(ownerId: string) {
    const { data, error } = await supabase
      .from('friend_invite_codes')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(ownerId: string) {
    const { data, error } = await supabase
      .from('friend_invite_codes')
      .insert({ owner_id: ownerId, code: generateCode() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Returns the new friendship id.
  async redeem(code: string) {
    const { data, error } = await supabase.rpc('redeem_invite_code', { p_code: code })
    if (error) throw error
    return data
  },
}
