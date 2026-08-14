import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { format } from 'date-fns'
import { incomeProfilesService, type PayScheduleInput } from '@/services/income-profiles.service'
import { getPayPeriod, suggestEarlyPeriodStart, type PayPeriod } from '@/core/pay-schedule'
import type { Database } from '@/types/database.types'

type IncomeProfile = Database['public']['Tables']['income_profiles']['Row']

function overrideDate(profile: IncomeProfile): Date | null {
  return profile.period_override_start ? new Date(profile.period_override_start) : null
}

function effectivePeriod(profile: IncomeProfile, referenceDate: Date): PayPeriod {
  return getPayPeriod(profile.payday, referenceDate, overrideDate(profile))
}

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
  //
  // Deliberately ignores any period_override_start -- this drives
  // usePeriodHistory's *past*-period reconstruction, which stays
  // formula-only (see currentPeriod below for the override-aware version
  // used for the live/current period).
  const referencePayday = computed(() => {
    if (!planPaydays.value.length) return paySchedule.value?.payday ?? null
    return Math.min(...planPaydays.value.map((profile) => profile.payday))
  })

  // The live shared period, accounting for each member's own override:
  // whichever member's own effective period (payday, or their early-pay
  // override if active) starts earliest wins -- same "earliest anchors
  // the shared window" rule as referencePayday, just override-aware. An
  // override can only pull a member's own start *earlier*, never later,
  // so this can never exclude or delay a partner's income.
  const currentPeriod = computed<PayPeriod | null>(() => {
    const referenceDate = new Date()
    if (planPaydays.value.length) {
      return planPaydays.value
        .map((profile) => effectivePeriod(profile, referenceDate))
        .reduce((earliest, period) => (period.start < earliest.start ? period : earliest))
    }
    if (!paySchedule.value) return null
    return effectivePeriod(paySchedule.value, referenceDate)
  })

  // Detects "your payday falls on a weekend this month" so the Income
  // page can offer to start the new period early -- suppressed once
  // already confirmed for this cycle, so it doesn't keep asking.
  const earlyPeriodSuggestion = computed(() => {
    if (!paySchedule.value) return null
    const suggested = suggestEarlyPeriodStart(paySchedule.value.payday, new Date())
    if (!suggested) return null
    if (paySchedule.value.period_override_start === format(suggested, 'yyyy-MM-dd')) return null
    return suggested
  })

  // The caller's own override, but only while it's actually the one
  // driving the current period (i.e. not stale) -- drives the "Angre"
  // (undo) link on the Income page.
  const activeOverrideDate = computed(() => {
    const override = paySchedule.value?.period_override_start
    if (!override || !currentPeriod.value) return null
    return override === format(currentPeriod.value.start, 'yyyy-MM-dd') ? override : null
  })

  function applyProfileUpdate(updated: IncomeProfile) {
    paySchedule.value = updated
    planPaydays.value = planPaydays.value.some((profile) => profile.profile_id === updated.profile_id)
      ? planPaydays.value.map((profile) =>
          profile.profile_id === updated.profile_id ? updated : profile,
        )
      : [...planPaydays.value, updated]
  }

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
    applyProfileUpdate(updated)
    return updated
  }

  async function confirmEarlyPeriod(planId: string, profileId: string, date: Date) {
    const updated = await incomeProfilesService.setPeriodOverride(
      planId,
      profileId,
      format(date, 'yyyy-MM-dd'),
    )
    applyProfileUpdate(updated)
    return updated
  }

  async function cancelPeriodOverride(planId: string, profileId: string) {
    const updated = await incomeProfilesService.setPeriodOverride(planId, profileId, null)
    applyProfileUpdate(updated)
    return updated
  }

  return {
    paySchedule,
    planPaydays,
    referencePayday,
    currentPeriod,
    earlyPeriodSuggestion,
    activeOverrideDate,
    loaded,
    load,
    save,
    confirmEarlyPeriod,
    cancelPeriodOverride,
  }
})
