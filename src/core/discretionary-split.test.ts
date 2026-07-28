import { describe, it, expect } from 'vitest'
import { splitDiscretionaryIncome } from './discretionary-split'

describe('splitDiscretionaryIncome', () => {
  it('splits the remaining amount 50/30/20 between fun, savings and unforeseen by default', () => {
    const result = splitDiscretionaryIncome(1000)

    expect(result.fun.value).toBeCloseTo(500)
    expect(result.savings.value).toBeCloseTo(300)
    expect(result.unforeseen.value).toBeCloseTo(200)
  })

  it('clamps to zero when the budget is already overspent', () => {
    const result = splitDiscretionaryIncome(-500)

    expect(result.fun.value).toBe(0)
    expect(result.savings.value).toBe(0)
    expect(result.unforeseen.value).toBe(0)
  })

  it('returns zero for all buckets when nothing is left', () => {
    const result = splitDiscretionaryIncome(0)

    expect(result.fun.value).toBe(0)
    expect(result.savings.value).toBe(0)
    expect(result.unforeseen.value).toBe(0)
  })

  it('splits 30/50/20 under the savings-focused model', () => {
    const result = splitDiscretionaryIncome(1000, 'savings-focused-30-50-20')

    expect(result.fun.value).toBeCloseTo(300)
    expect(result.savings.value).toBeCloseTo(500)
    expect(result.unforeseen.value).toBeCloseTo(200)
  })

  it('splits 70/20/10 under the relaxed model', () => {
    const result = splitDiscretionaryIncome(1000, 'relaxed-70-20-10')

    expect(result.fun.value).toBeCloseTo(700)
    expect(result.savings.value).toBeCloseTo(200)
    expect(result.unforeseen.value).toBeCloseTo(100)
  })

  it('tags each result with the chosen model id', () => {
    const result = splitDiscretionaryIncome(1000, 'relaxed-70-20-10')

    expect(result.fun.model).toBe('discretionary-split-relaxed-70-20-10')
  })
})
