import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { incomeProfilesService, type PayScheduleInput } from '@/services/income-profiles.service'
import type { Database } from '@/types/database.types'

type IncomeProfile = Database['public']['Tables']['income_profiles']['Row']

// Holds the current user's own pay-schedule config (payday) for a plan --
// actual income amounts are logged per period via income-payments.store.ts.
export const useIncomeStore = defineStore('income', () => {
  const paySchedule = ref<IncomeProfile | null>(null)
  // Every member's payday on this plan, so a shared plan's period can be
  // anchored to one date instead of each viewer computing their own.
  const planPaydays = ref<IncomeProfile[]>([])
  const loaded = ref(false)

  // The plan-wide period boundary: the earliest payday among all members.
  // A member's own payday always falls on/after this one within the same
  // monthly cycle, so anchoring the period here (rather than to whichever
  // partner happens to be looking) guarantees both partners' income lands
  // inside the same window -- fixes income logged near one partner's
  // payday silently falling outside the other partner's own period.
  const referencePayday = computed(() => {
    if (!planPaydays.value.length) return paySchedule.value?.payday ?? null
    return Math.min(...planPaydays.value.map((profile) => profile.payday))
  })

  async function load(planId: string, profileId: string) {
    const [mine, everyone] = await Promise.all([
      incomeProfilesService.getMine(planId, profileId),
      incomeProfilesService.listByPlan(planId),
    ])
    paySchedule.value = mine
    planPaydays.value = everyone
    loaded.value = true
  }

  async function save(input: PayScheduleInput) {
    const updated = await incomeProfilesService.upsert(input)
    paySchedule.value = updated
    planPaydays.value = planPaydays.value.some((profile) => profile.profile_id === input.profileId)
      ? planPaydays.value.map((profile) => (profile.profile_id === input.profileId ? updated : profile))
      : [...planPaydays.value, updated]
    return updated
  }

  return { paySchedule, planPaydays, referencePayday, loaded, load, save }
})
