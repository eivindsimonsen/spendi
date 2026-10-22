import type { Celebration } from './types/celebration'

export interface GoalProgress {
  targetAmount: number
  savedAmount: number
}

// Everything a badge can depend on, for one plan's savings. Derived from
// goals and contributions on every read rather than stored, so there's
// no unlock state to keep in sync -- a badge is simply on whenever the
// data says it's earned.
export interface SavingsStats {
  goalCount: number
  halfwayGoalCount: number
  completedGoalCount: number
  contributionCount: number
  totalSaved: number
  longestStreak: number
}

export function buildSavingsStats(
  goals: readonly GoalProgress[],
  contributionCount: number,
  longestStreak: number,
): SavingsStats {
  const reached = (goal: GoalProgress, share: number) =>
    goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount * share

  return {
    goalCount: goals.length,
    halfwayGoalCount: goals.filter((goal) => reached(goal, 0.5)).length,
    completedGoalCount: goals.filter((goal) => reached(goal, 1)).length,
    contributionCount,
    totalSaved: goals.reduce((sum, goal) => sum + goal.savedAmount, 0),
    longestStreak,
  }
}

export interface Achievement {
  id: string
  icon: string
  title: string
  // Phrased as a plain fact, so it reads right both as what it takes on
  // a locked badge and as what was done when it unlocks.
  description: string
  isUnlocked: (stats: SavingsStats) => boolean
}

// Milestones the household reaches together -- every badge counts the
// whole plan's savings, never who in it contributed what.
export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-goal',
    icon: '🌱',
    title: 'Første spire',
    description: 'Et sparemål opprettet',
    isUnlocked: (stats) => stats.goalCount >= 1,
  },
  {
    id: 'first-contribution',
    icon: '🪙',
    title: 'Første krone',
    description: 'Første innskudd på et sparemål',
    isUnlocked: (stats) => stats.contributionCount >= 1,
  },
  {
    id: 'halfway',
    icon: '🎯',
    title: 'Halvveis',
    description: 'Halvveis til et sparemål',
    isUnlocked: (stats) => stats.halfwayGoalCount >= 1,
  },
  {
    id: 'goal-completed',
    icon: '🏆',
    title: 'I mål',
    description: 'Et sparemål nådd',
    isUnlocked: (stats) => stats.completedGoalCount >= 1,
  },
  {
    id: 'saved-10k',
    icon: '💰',
    title: '10 000 kr',
    description: '10 000 kr spart til sammen',
    isUnlocked: (stats) => stats.totalSaved >= 10_000,
  },
  {
    id: 'saved-50k',
    icon: '💎',
    title: '50 000 kr',
    description: '50 000 kr spart til sammen',
    isUnlocked: (stats) => stats.totalSaved >= 50_000,
  },
  {
    id: 'saved-100k',
    icon: '👑',
    title: '100 000 kr',
    description: '100 000 kr spart til sammen',
    isUnlocked: (stats) => stats.totalSaved >= 100_000,
  },
  {
    id: 'streak-3',
    icon: '🔥',
    title: 'På rad',
    description: 'Sparing tre lønningsperioder på rad',
    isUnlocked: (stats) => stats.longestStreak >= 3,
  },
  {
    id: 'streak-6',
    icon: '⚡',
    title: 'Ustoppelig',
    description: 'Sparing seks lønningsperioder på rad',
    isUnlocked: (stats) => stats.longestStreak >= 6,
  },
  {
    id: 'three-goals',
    icon: '🌈',
    title: 'Store drømmer',
    description: 'Tre sparemål samtidig',
    isUnlocked: (stats) => stats.goalCount >= 3,
  },
]

// Badges earned by whatever happened between two snapshots -- what a
// single action (a contribution, a new goal) just unlocked.
export function newlyUnlockedAchievements(
  before: SavingsStats,
  after: SavingsStats,
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (achievement) => !achievement.isUnlocked(before) && achievement.isUnlocked(after),
  )
}

export function achievementCelebration(achievement: Achievement): Celebration {
  return {
    icon: achievement.icon,
    title: `Nytt merke: ${achievement.title}`,
    message: `${achievement.description}!`,
  }
}
