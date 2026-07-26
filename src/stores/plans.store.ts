import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { plansService } from '@/services/plans.service'
import { planMembersService, type PlanMemberStatus } from '@/services/plan-members.service'
import type { Database } from '@/types/database.types'

type Plan = Database['public']['Tables']['plans']['Row']
type PlanMember = Database['public']['Tables']['plan_members']['Row']

// Tracks every plan the user belongs to (individual + any accepted
// shared Spendiplan) and which one is currently "active" for
// viewing/logging -- every view that reads `activePlan` automatically
// follows whichever plan is selected, so there's one plan switcher
// (see OverviewView) rather than a separate picker per feature.
export const usePlansStore = defineStore('plans', () => {
  const myPlans = ref<Plan[]>([])
  const activePlanId = ref<string | null>(null)
  const loaded = ref(false)

  const pendingInvites = ref<PlanMember[]>([])
  const pendingInvitePlans = ref<Map<string, Plan>>(new Map())

  const activePlan = computed(() => myPlans.value.find((plan) => plan.id === activePlanId.value) ?? null)

  async function loadMyPlans() {
    myPlans.value = await plansService.listMine()

    const activeStillValid = myPlans.value.some((plan) => plan.id === activePlanId.value)
    if (!activeStillValid) {
      const individual = myPlans.value.find((plan) => plan.type === 'individual')
      activePlanId.value = individual?.id ?? myPlans.value[0]?.id ?? null
    }

    loaded.value = true
  }

  function setActivePlan(id: string) {
    activePlanId.value = id
  }

  async function proposeSharedPlan(name: string, inviteeId: string) {
    const newPlanId = await plansService.proposeSharedPlan(name, inviteeId)
    await loadMyPlans()
    return newPlanId
  }

  async function createIndividualPlan(name: string) {
    const newPlanId = await plansService.createIndividual(name)
    await loadMyPlans()
    setActivePlan(newPlanId)
    return newPlanId
  }

  async function deletePlan(id: string) {
    if (myPlans.value.length <= 1) {
      throw new Error('Du kan ikke slette din siste plan.')
    }
    await plansService.delete(id)
    await loadMyPlans()
  }

  async function loadPendingInvites(profileId: string) {
    pendingInvites.value = await planMembersService.listPendingInvitesForProfile(profileId)

    const planIds = [...new Set(pendingInvites.value.map((invite) => invite.plan_id))]
    const plans = planIds.length ? await plansService.getByIds(planIds) : []
    pendingInvitePlans.value = new Map(plans.map((plan) => [plan.id, plan]))
  }

  async function respondToInvite(memberId: string, status: PlanMemberStatus) {
    await planMembersService.respond(memberId, status)
    pendingInvites.value = pendingInvites.value.filter((invite) => invite.id !== memberId)

    if (status === 'accepted') {
      await loadMyPlans()
    }
  }

  return {
    myPlans,
    activePlanId,
    activePlan,
    loaded,
    pendingInvites,
    pendingInvitePlans,
    loadMyPlans,
    setActivePlan,
    proposeSharedPlan,
    createIndividualPlan,
    deletePlan,
    loadPendingInvites,
    respondToInvite,
  }
})
