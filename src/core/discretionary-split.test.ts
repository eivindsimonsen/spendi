import { describe, it, expect } from 'vitest'
import { splitDiscretionaryIncome } from './discretionary-split'

describe('splitDiscretionaryIncome', () => {
  it('splits the remaining amount 50/30/20 between fun, savings and unforeseen', () => {
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
})
