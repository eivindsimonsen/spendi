import { supabase } from '@/lib/supabase'

export interface CreateIncomePaymentInput {
  planId: string
  amount: number
  receivedOn: string
  note?: string
  createdBy: string
}

export const incomePaymentsService = {
  async create(input: CreateIncomePaymentInput) {
    const { data, error } = await supabase
      .from('income_payments')
      .insert({
        plan_id: input.planId,
        amount: input.amount,
        received_on: input.receivedOn,
        note: input.note,
        created_by: input.createdBy,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Used to sum up what's been logged for a given pay period.
  async listInRange(planId: string, fromDate: string, toDate: string) {
    const { data, error } = await supabase
      .from('income_payments')
      .select('*')
      .eq('plan_id', planId)
      .gte('received_on', fromDate)
      .lt('received_on', toDate)
      .order('received_on', { ascending: false })
    if (error) throw error
    return data
  },
}
