import { describe, it, expect } from 'vitest'
import {
  ACHIEVEMENTS,
  buildSavingsStats,
  newlyUnlockedAchievements,
  achievementCelebration,
  type SavingsStats,
} from './achievements'

const empty: SavingsStats = {
  goalCount: 0,
  halfwayGoalCount: 0,
  completedGoalCount: 0,
  contributionCount: 0,
  totalSaved: 0,
  longestStreak: 0,
}

describe('buildSavingsStats', () => {
  it('counts goals by how far along they are and sums what is saved', () => {
    const stats = buildSavingsStats(
      [
        { targetAmount: 10000, savedAmount: 2000 },
        { targetAmount: 10000, savedAmount: 5000 },
        { targetAmount: 4000, savedAmount: 4500 },
      ],
      7,
      2,
    )

    expect(stats).toEqual({
      goalCount: 3,
      halfwayGoalCount: 2,
      completedGoalCount: 1,
      contributionCount: 7,
      totalSaved: 11500,
      longestStreak: 2,
    })
  })

  it("doesn't count a goal without a target as reached", () => {
    const stats = buildSavingsStats([{ targetAmount: 0, savedAmount: 0 }], 0, 0)

    expect(stats.completedGoalCount).toBe(0)
  })
})

describe('ACHIEVEMENTS', () => {
  it('has a unique id per badge', () => {
    const ids = ACHIEVEMENTS.map((achievement) => achievement.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('unlocks nothing for a plan with no savings yet', () => {
    expect(ACHIEVEMENTS.filter((achievement) => achievement.isUnlocked(empty))).toEqual([])
  })
})

describe('newlyUnlockedAchievements', () => {
  it('returns only the badges the change unlocked', () => {
    const before = { ...empty, goalCount: 1, contributionCount: 2, totalSaved: 9000 }
    const after = { ...before, contributionCount: 3, totalSaved: 11000 }

    const unlocked = newlyUnlockedAchievements(before, after)

    expect(unlocked.map((achievement) => achievement.id)).toEqual(['saved-10k'])
  })

  it('returns several when one change crosses several thresholds', () => {
    const after = { ...empty, goalCount: 1, contributionCount: 1, halfwayGoalCount: 1 }

    const unlocked = newlyUnlockedAchievements(empty, after)

    expect(unlocked.map((achievement) => achievement.id)).toEqual([
      'first-goal',
      'first-contribution',
      'halfway',
    ])
  })
})

describe('achievementCelebration', () => {
  it('announces the badge by name', () => {
    const badge = ACHIEVEMENTS.find((achievement) => achievement.id === 'saved-10k')!
    expect(achievementCelebration(badge).title).toBe('Nytt merke: 10 000 kr')
  })
})
