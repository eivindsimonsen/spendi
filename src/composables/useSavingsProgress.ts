import { computed } from 'vue'
import { useSavingsStore } from '@/stores/savings.store'
import { useIncomeStore } from '@/stores/income.store'
import { usePlansStore } from '@/stores/plans.store'
import { useCelebrationStore } from '@/stores/celebration.store'
import { calculateSavingsStreak } from '@/core/savings-streak'
import { calculateTotalSaved } from '@/core/savings-calculator'
import { crossedMilestone, milestoneCelebration } from '@/core/savings-milestones'
import {
  ACHIEVEMENTS,
  buildSavingsStats,
  newlyUnlockedAchievements,
  achievementCelebration,
} from '@/core/achievements'
import { pickMotivation } from '@/core/motivation'

// The rewarding side of saving -- streak, badges, the Overview's
// encouraging line, and the confetti when a contribution passes a
// milestone. Derived entirely from what's already loaded: the active
// plan's goals and contributions (savings store) and its payday (income
// store, for where pay periods start). Loads nothing itself, so the
// views using it decide what to fetch, as with every other store read.
export function useSavingsProgress() {
  const savingsStore = useSavingsStore()
  const incomeStore = useIncomeStore()
  const plansStore = usePlansStore()
  const celebrationStore = useCelebrationStore()

  const allContributions = computed(() => [...savingsStore.contributionsByGoal.values()].flat())

  const goalProgress = computed(() =>
    savingsStore.goals.map((goal) => ({
      name: goal.name,
      targetAmount: goal.target_amount,
      savedAmount: savingsStore.contributionsTotal(goal.id),
    })),
  )

  // Null until the plan's payday is known -- without it there are no pay
  // periods to count a streak in.
  const streak = computed(() => {
    if (incomeStore.referencePayday == null) return null
    return calculateSavingsStreak(
      incomeStore.referencePayday,
      new Date(),
      allContributions.value.map((contribution) => contribution.occurred_on),
    )
  })

  const totalSaved = computed(() => calculateTotalSaved(goalProgress.value))

  const stats = computed(() =>
    buildSavingsStats(
      goalProgress.value,
      allContributions.value.length,
      streak.value?.longest ?? 0,
    ),
  )

  const achievements = computed(() =>
    ACHIEVEMENTS.map((achievement) => ({
      ...achievement,
      unlocked: achievement.isUnlocked(stats.value),
    })),
  )

  const motivation = computed(() =>
    pickMotivation(
      {
        isShared: plansStore.activePlan?.type === 'shared',
        totalSaved: totalSaved.value.value,
        currentStreak: streak.value?.current.value ?? 0,
        goals: goalProgress.value,
      },
      new Date(),
    ),
  )

  // Runs a savings action and celebrates whatever it achieved: the
  // milestone `goalId` just passed, then any badge it unlocked. Compares
  // before and after rather than storing what's been seen, so it only
  // ever fires for something that happened right now, on this screen.
  async function withCelebrations<T>(action: () => Promise<T>, goalId?: string): Promise<T> {
    const statsBefore = stats.value
    const savedBefore = goalId ? savingsStore.contributionsTotal(goalId) : 0

    const result = await action()

    const goal = goalId ? savingsStore.goals.find((item) => item.id === goalId) : undefined
    if (goal) {
      const milestone = crossedMilestone(
        savedBefore,
        savingsStore.contributionsTotal(goal.id),
        goal.target_amount,
      )
      if (milestone) celebrationStore.celebrate(milestoneCelebration(goal.name, milestone))
    }

    for (const achievement of newlyUnlockedAchievements(statsBefore, stats.value)) {
      celebrationStore.celebrate(achievementCelebration(achievement))
    }

    return result
  }

  return { streak, totalSaved, achievements, motivation, withCelebrations }
}
