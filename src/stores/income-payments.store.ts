import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  incomePaymentsService,
  type CreateIncomePaymentInput,
} from '@/services/income-payments.service'
import type { Database } from '@/types/database.types'

type IncomePayment = Database['public']['Tables']['income_payments']['Row']

export const useIncomePaymentsStore = defineStore('incomePayments', () => {
  const currentPeriodPayments = ref<IncomePayment[]>([])
  const loaded = ref(false)

  async function loadForPeriod(planId: string, fromDate: string, toDate: string) {
    currentPeriodPayments.value = await incomePaymentsService.listInRange(planId, fromDate, toDate)
    loaded.value = true
  }

  async function create(input: CreateIncomePaymentInput) {
    const created = await incomePaymentsService.create(input)
    currentPeriodPayments.value = [created, ...currentPeriodPayments.value]
    return created
  }

  return { currentPeriodPayments, loaded, loadForPeriod, create }
})
