import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  incomePaymentsService,
  type CreateIncomePaymentInput,
  type UpdateIncomePaymentInput,
} from '@/services/income-payments.service'
import type { Database } from '@/types/database.types'

type IncomePayment = Database['public']['Tables']['income_payments']['Row']

export const useIncomePaymentsStore = defineStore('incomePayments', () => {
  const currentPeriodPayments = ref<IncomePayment[]>([])
  const loaded = ref(false)

  // Wider-window history for the statistics page, kept separate from
  // currentPeriodPayments so loading one doesn't clobber the other.
  const historyPayments = ref<IncomePayment[]>([])

  async function loadForPeriod(planId: string, fromDate: string, toDate: string) {
    currentPeriodPayments.value = await incomePaymentsService.listInRange(planId, fromDate, toDate)
    loaded.value = true
  }

  async function loadHistory(planId: string, fromDate: string, toDate: string) {
    historyPayments.value = await incomePaymentsService.listInRange(planId, fromDate, toDate)
  }

  async function create(input: CreateIncomePaymentInput) {
    const created = await incomePaymentsService.create(input)
    currentPeriodPayments.value = [created, ...currentPeriodPayments.value]
    return created
  }

  async function update(id: string, changes: UpdateIncomePaymentInput) {
    const updated = await incomePaymentsService.update(id, changes)
    currentPeriodPayments.value = currentPeriodPayments.value.map((payment) =>
      payment.id === id ? updated : payment,
    )
    return updated
  }

  async function remove(id: string) {
    await incomePaymentsService.delete(id)
    currentPeriodPayments.value = currentPeriodPayments.value.filter((payment) => payment.id !== id)
  }

  return {
    currentPeriodPayments,
    loaded,
    historyPayments,
    loadForPeriod,
    loadHistory,
    create,
    update,
    remove,
  }
})
