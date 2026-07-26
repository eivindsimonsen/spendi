import { ref } from 'vue'
import { defineStore } from 'pinia'
import { incomeProfilesService, type PayScheduleInput } from '@/services/income-profiles.service'
import type { Database } from '@/types/database.types'

type IncomeProfile = Database['public']['Tables']['income_profiles']['Row']

// Holds the current user's own pay-schedule config (payday) for a plan --
// actual income amounts are logged per period via income-payments.store.ts.
export const useIncomeStore = defineStore('income', () => {
  const paySchedule = ref<IncomeProfile | null>(null)
  const loaded = ref(false)

  async function load(planId: string, profileId: string) {
    paySchedule.value = await incomeProfilesService.getMine(planId, profileId)
    loaded.value = true
  }

  async function save(input: PayScheduleInput) {
    paySchedule.value = await incomeProfilesService.upsert(input)
    return paySchedule.value
  }

  return { paySchedule, loaded, load, save }
})
