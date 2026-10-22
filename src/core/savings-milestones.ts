import type { Celebration } from './types/celebration'

export const MILESTONE_PERCENTS = [25, 50, 75, 100] as const
export type MilestonePercent = (typeof MILESTONE_PERCENTS)[number]

// The highest milestone a goal passed going from `previousAmount` to
// `newAmount` saved, or null if it passed none. Only the highest one: a
// single contribution that jumps from 0 % to 80 % is one moment, so it
// celebrates 75 % once rather than three times in a row.
export function crossedMilestone(
  previousAmount: number,
  newAmount: number,
  targetAmount: number,
): MilestonePercent | null {
  if (targetAmount <= 0) return null
  const before = (previousAmount / targetAmount) * 100
  const after = (newAmount / targetAmount) * 100
  const crossed = MILESTONE_PERCENTS.filter((percent) => before < percent && after >= percent)
  return crossed[crossed.length - 1] ?? null
}

export function milestoneCelebration(goalName: string, milestone: MilestonePercent): Celebration {
  switch (milestone) {
    case 25:
      return {
        icon: '🌱',
        title: 'En fjerdedel!',
        message: `«${goalName}» er 25 % av veien. God start!`,
      }
    case 50:
      return {
        icon: '🎉',
        title: 'Halvveis!',
        message: `«${goalName}» er halvveis. Det går unna!`,
      }
    case 75:
      return {
        icon: '🚀',
        title: 'Snart i mål!',
        message: `«${goalName}» er 75 % av veien. Siste innspurt!`,
      }
    case 100:
      return {
        icon: '🏆',
        title: 'Målet er nådd!',
        message: `«${goalName}» er fullført. Gratulerer! 🥳`,
      }
  }
}
