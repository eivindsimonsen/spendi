import { supabase } from '@/lib/supabase'

// An expense belongs to whoever paid it, not to a plan: it shows up in
// every plan they're a member of, like a recurring cost does.
export interface CreateTransactionInput {
  name: string
  categoryId: string
  amount: number
  occurredOn: string
  paidBy: string
  createdBy: string
  recurringCostId?: string
}

export interface TransactionFilters {
  categoryId?: string
  fromDate?: string
  toDate?: string
}

// The expenses that apply to one plan: every accepted member's own,
// merged. An RPC rather than a client-side join, so the "whose expenses
// count here" rule lives next to the RLS policies that enforce it (see
// supabase/migrations). Its result filters and orders like a table.
function listForPlan(planId: string) {
  return supabase.rpc('list_plan_transactions', { p_plan_id: planId })
}

export const transactionsService = {
  async create(input: CreateTransactionInput) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        name: input.name,
        category_id: input.categoryId,
        amount: input.amount,
        occurred_on: input.occurredOn,
        paid_by: input.paidBy,
        created_by: input.createdBy,
        recurring_cost_id: input.recurringCostId,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Used to feed the variable-cost rolling average -- fetches everything
  // logged since a given date so the caller can group by category itself.
  async listByPlanSince(planId: string, sinceDate: string) {
    const { data, error } = await listForPlan(planId)
      .gte('occurred_on', sinceDate)
      .order('occurred_on', { ascending: false })
    if (error) throw error
    return data
  },

  // Full history for the History view, optionally narrowed
  // by category and/or date range.
  async listByPlan(planId: string, filters: TransactionFilters = {}) {
    let query = listForPlan(planId)

    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters.fromDate) query = query.gte('occurred_on', filters.fromDate)
    if (filters.toDate) query = query.lte('occurred_on', filters.toDate)

    const { data, error } = await query.order('occurred_on', { ascending: false })
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  },
}
