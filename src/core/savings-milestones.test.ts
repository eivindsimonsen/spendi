import { describe, it, expect } from 'vitest'
import { crossedMilestone, milestoneCelebration } from './savings-milestones'

describe('crossedMilestone', () => {
  it('reports the milestone a contribution passes', () => {
    expect(crossedMilestone(4000, 5000, 10000)).toBe(50)
  })

  it('counts landing exactly on a milestone as passing it', () => {
    expect(crossedMilestone(2000, 2500, 10000)).toBe(25)
  })

  it('reports only the highest when one contribution jumps several', () => {
    expect(crossedMilestone(0, 8000, 10000)).toBe(75)
  })

  it('reports nothing between milestones or for one already passed', () => {
    expect(crossedMilestone(5100, 6000, 10000)).toBeNull()
    expect(crossedMilestone(5000, 5000, 10000)).toBeNull()
  })

  it('celebrates reaching the goal, even when overshooting it', () => {
    expect(crossedMilestone(9000, 12000, 10000)).toBe(100)
  })

  it('reports nothing for a goal without a target', () => {
    expect(crossedMilestone(0, 500, 0)).toBeNull()
  })
})

describe('milestoneCelebration', () => {
  it('names the goal in the message', () => {
    expect(milestoneCelebration('Italia', 50).message).toContain('«Italia»')
    expect(milestoneCelebration('Italia', 100).title).toBe('Målet er nådd!')
  })
})
