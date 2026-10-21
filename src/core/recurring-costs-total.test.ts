import { describe, it, expect } from 'vitest'
import { sumRecurringCosts } from './recurring-costs-total'

describe('sumRecurringCosts', () => {
  it('sums the entered monthly amounts', () => {
    const result = sumRecurringCosts([
      { name: 'Husleie', amount: 12000, isVariable: false },
      { name: 'Netflix', amount: 149, isVariable: false },
    ])

    expect(result.value).toBe(12149)
    expect(result.steps[0]?.formula).toBe('Husleie + Netflix')
  })

  it('counts a variable cost with its manual estimate and labels it as one', () => {
    const result = sumRecurringCosts([
      { name: 'Husleie', amount: 12000, isVariable: false },
      { name: 'Strøm', amount: 1200, isVariable: true },
    ])

    expect(result.value).toBe(13200)
    expect(result.steps[0]?.inputs.map((input) => input.label)).toEqual([
      'Husleie',
      'Strøm (anslag)',
    ])
    expect(result.summary).toContain('1 av dem varierer')
  })

  it('treats a cost with no amount as 0 kr rather than skipping it', () => {
    const result = sumRecurringCosts([
      { name: 'Husleie', amount: 12000, isVariable: false },
      { name: 'Strøm', amount: null, isVariable: true },
    ])

    expect(result.value).toBe(12000)
    expect(result.steps[0]?.inputs).toHaveLength(2)
    expect(result.steps[0]?.inputs[1]?.value).toBe(0)
  })

  it('returns 0 for an empty list', () => {
    const result = sumRecurringCosts([])

    expect(result.value).toBe(0)
    expect(result.steps[0]?.formula).toBe('0')
  })

  it('only mentions variable costs in the summary when there are any', () => {
    const result = sumRecurringCosts([{ name: 'Husleie', amount: 12000, isVariable: false }])

    expect(result.summary).toBe('Sum av 1 fast utgift per måned, slik du har lagt den inn.')
  })
})
