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
  // Feeds the variable-cost rolling average (Overview) and the Statistics
  // page.
  const recentTransactions = ref<Transaction[]>([])

  // Full, filterable list for the History view.
  const history = ref<Transaction[]>([])

  async function loadSince(planId: string, sinceDate: string) {
    recentTransactions.value = await transactionsService.listByPlanSince(planId, sinceDate)
  }

  async function loadHistory(planId: string, filters: TransactionFilters = {}) {
    history.value = await transactionsService.listByPlan(planId, filters)
  }

  async function create(input: CreateTransactionInput) {
    const created = await transactionsService.create(input)
    recentTransactions.value = [created, ...recentTransactions.value]
    return created
  }

  async function remove(id: string) {
    await transactionsService.delete(id)
    recentTransactions.value = recentTransactions.value.filter((tx) => tx.id !== id)
    history.value = history.value.filter((tx) => tx.id !== id)
  }

  return {
    recentTransactions,
    history,
    loadSince,
    loadHistory,
    create,
    remove,
  }
})
