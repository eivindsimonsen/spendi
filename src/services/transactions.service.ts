import { supabase } from '@/lib/supabase'

export interface CreateTransactionInput {
  planId: string
  categoryId: string
  amount: number
  occurredOn: string
  note?: string
  paidBy: string
  createdBy: string
  recurringCostId?: string
}

export interface TransactionFilters {
  categoryId?: string
  fromDate?: string
  toDate?: string
}

export const transactionsService = {
  async create(input: CreateTransactionInput) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        plan_id: input.planId,
        category_id: input.categoryId,
        amount: input.amount,
        occurred_on: input.occurredOn,
        note: input.note,
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
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('plan_id', planId)
      .gte('occurred_on', sinceDate)
      .order('occurred_on', { ascending: false })
    if (error) throw error
    return data
  },

  // Full history for the History & statistics view, optionally narrowed
  // by category and/or date range.
  async listByPlan(planId: string, filters: TransactionFilters = {}) {
    let query = supabase.from('transactions').select('*').eq('plan_id', planId)

    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters.fromDate) query = query.gte('occurred_on', filters.fromDate)
    if (filters.toDate) query = query.lte('occurred_on', filters.toDate)

    const { data, error } = await query.order('occurred_on', { ascending: false })
    if (error) throw error
    return data
  },
}
