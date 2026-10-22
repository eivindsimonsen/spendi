import { describe, it, expect } from 'vitest'
import { addDays } from 'date-fns'
import { pickMotivation, type MotivationInput } from './motivation'

const today = new Date(2026, 9, 25)

const input: MotivationInput = {
  isShared: true,
  totalSaved: 12400,
  currentStreak: 3,
  goals: [
    { name: 'Italia', targetAmount: 20000, savedAmount: 7000 },
    { name: 'Bryllup', targetAmount: 6000, savedAmount: 5400 },
  ],
}

function messagesOverDays(motivation: MotivationInput, days: number): Set<string | null> {
  const seen = new Set<string | null>()
  for (let i = 0; i < days; i++) seen.add(pickMotivation(motivation, addDays(today, i)))
  return seen
}

describe('pickMotivation', () => {
  it('keeps the same message through a whole day', () => {
    const morning = new Date(2026, 9, 25, 7)
    const evening = new Date(2026, 9, 25, 23)

    expect(pickMotivation(input, morning)).toBe(pickMotivation(input, evening))
  })

  it('rotates through everything there is to say', () => {
    const seen = messagesOverDays(input, 3)

    expect(seen.size).toBe(3)
    expect([...seen].some((message) => message?.includes('«Bryllup»'))).toBe(true)
  })

  it('points to the goal closest to being reached', () => {
    const seen = [...messagesOverDays(input, 3)]

    expect(seen.find((message) => message?.startsWith('Bare'))).toContain('«Bryllup»')
  })

  it('says "du" in a plan of your own and "dere" in a shared one', () => {
    const own = { ...input, isShared: false, currentStreak: 0, goals: [] }
    const shared = { ...own, isShared: true }

    expect(pickMotivation(own, today)).toMatch(/^Du har spart/)
    expect(pickMotivation(shared, today)).toMatch(/^Dere har spart/)
  })

  it('encourages a first contribution when there are goals but no savings', () => {
    const fresh = {
      ...input,
      totalSaved: 0,
      currentStreak: 0,
      goals: [{ name: 'Italia', targetAmount: 20000, savedAmount: 0 }],
    }

    expect(pickMotivation(fresh, today)).toContain('Hver krone teller')
  })

  it('has nothing to say without goals or savings', () => {
    const nothing = { ...input, totalSaved: 0, currentStreak: 0, goals: [] }

    expect(pickMotivation(nothing, today)).toBeNull()
  })
})
