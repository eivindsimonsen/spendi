import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  transactionsService,
  type CreateTransactionInput,
  type TransactionFilters,
} from '@/services/transactions.service'
import type { Database } from '@/types/database.types'

type Transaction = Database['public']['Tables']['transactions']['Row']

export const useTransactionsStore = defineStore('transactions', () => {
  // Feeds the variable-cost rolling average (Overview).
  const recentTransactions = ref<Transaction[]>([])
  const loaded = ref(false)

  // Full, filterable list for the History & statistics view.
  const history = ref<Transaction[]>([])
  const historyLoaded = ref(false)

  async function loadSince(planId: string, sinceDate: string) {
    recentTransactions.value = await transactionsService.listByPlanSince(planId, sinceDate)
    loaded.value = true
  }

  async function loadHistory(planId: string, filters: TransactionFilters = {}) {
    history.value = await transactionsService.listByPlan(planId, filters)
    historyLoaded.value = true
  }

  async function create(input: CreateTransactionInput) {
    const created = await transactionsService.create(input)
    recentTransactions.value = [created, ...recentTransactions.value]
    return created
  }

  return {
    recentTransactions,
    loaded,
    history,
    historyLoaded,
    loadSince,
    loadHistory,
    create,
  }
})
