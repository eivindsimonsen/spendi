// Hand-written to match supabase/migrations/*.sql while the Supabase CLI
// isn't yet linked to the project in this environment. Regenerate with
// `npx supabase gen types typescript --project-id <ref> --schema public`
// once `supabase login && supabase link` has been run, and this file can
// be replaced outright rather than hand-edited from then on.
//
// `Relationships: []` and `Views: Record<string, never>` are structurally
// required by supabase-js's GenericSchema/GenericTable types (see
// @supabase/supabase-js/src/lib/rest/types/common/common.ts) -- without
// them every table's Insert/Update resolves to `never`.

export type PlanType = 'individual' | 'shared'
export type PlanMemberRole = 'owner' | 'member'
export type PlanMemberStatus = 'pending' | 'accepted' | 'declined'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          created_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          name: string
          type: PlanType
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: PlanType
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: PlanType
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      plan_members: {
        Row: {
          id: string
          plan_id: string
          profile_id: string
          role: PlanMemberRole
          status: PlanMemberStatus
          invited_by: string | null
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          plan_id: string
          profile_id: string
          role?: PlanMemberRole
          status?: PlanMemberStatus
          invited_by?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          plan_id?: string
          profile_id?: string
          role?: PlanMemberRole
          status?: PlanMemberStatus
          invited_by?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Relationships: []
      }
      friend_invite_codes: {
        Row: {
          id: string
          owner_id: string
          code: string
          created_at: string
          expires_at: string | null
          redeemed_by: string | null
          redeemed_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          redeemed_by?: string | null
          redeemed_at?: string | null
        }
        Update: {
          id?: string
          owner_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          redeemed_by?: string | null
          redeemed_at?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          created_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          created_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          addressee_id?: string
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          plan_id: string | null
          is_system: boolean
          name: string
          icon: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          plan_id?: string | null
          is_system?: boolean
          name: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string | null
          is_system?: boolean
          name?: string
          icon?: string | null
          color?: string | null
          created_at?: string
        }
        Relationships: []
      }
      recurring_costs: {
        Row: {
          id: string
          plan_id: string
          category_id: string
          name: string
          amount: number | null
          is_variable: boolean
          active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          category_id: string
          name: string
          amount?: number | null
          is_variable?: boolean
          active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          category_id?: string
          name?: string
          amount?: number | null
          is_variable?: boolean
          active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          plan_id: string
          category_id: string
          recurring_cost_id: string | null
          amount: number
          occurred_on: string
          note: string | null
          paid_by: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          category_id: string
          recurring_cost_id?: string | null
          amount: number
          occurred_on: string
          note?: string | null
          paid_by: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          category_id?: string
          recurring_cost_id?: string | null
          amount?: number
          occurred_on?: string
          note?: string | null
          paid_by?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      income_profiles: {
        Row: {
          id: string
          plan_id: string
          payday: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          payday?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          payday?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      income_payments: {
        Row: {
          id: string
          plan_id: string
          amount: number
          received_on: string
          note: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          amount: number
          received_on: string
          note?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          amount?: number
          received_on?: string
          note?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          id: string
          plan_id: string
          name: string
          target_amount: number
          target_date: string
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          name: string
          target_amount: number
          target_date: string
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          name?: string
          target_amount?: number
          target_date?: string
          created_at?: string
        }
        Relationships: []
      }
      savings_contributions: {
        Row: {
          id: string
          goal_id: string
          amount: number
          occurred_on: string
          note: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          amount: number
          occurred_on: string
          note?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          amount?: number
          occurred_on?: string
          note?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_plan_member: {
        Args: { p_plan_id: string }
        Returns: boolean
      }
      redeem_invite_code: {
        Args: { p_code: string }
        Returns: string
      }
      propose_shared_plan: {
        Args: { p_name: string; p_invitee_id: string }
        Returns: string
      }
    }
  }
}
