import { describe, it, expect } from 'vitest'
import { calculateDailyAllowance, classifyDailyAllowance } from './daily-allowance'

describe('calculateDailyAllowance', () => {
  it('divides the amount by the number of days remaining', () => {
    const result = calculateDailyAllowance(1000, 10)
    expect(result.value).toBeCloseTo(100)
  })

  it('clamps days to at least 1 instead of dividing by zero', () => {
    const result = calculateDailyAllowance(500, 0)
    expect(result.value).toBe(500)
  })

  it('clamps a negative day count to at least 1', () => {
    const result = calculateDailyAllowance(500, -3)
    expect(result.value).toBe(500)
  })

  it('clamps a negative amount to zero', () => {
    const result = calculateDailyAllowance(-200, 5)
    expect(result.value).toBe(0)
  })

  it('names the pay date and whose payday it is in the explanation', () => {
    const result = calculateDailyAllowance(100, 1, { date: new Date(2026, 10, 12), name: 'Kari' })
    const inputs = result.steps[0]!.inputs
    const nextPay = inputs.find((input) => input.label === 'Neste lønn')
    expect(nextPay?.value).toContain('Kari')
    expect(result.summary).toContain('Kari')
  })

  it('leaves out the pay date when none is given', () => {
    const result = calculateDailyAllowance(100, 2)
    expect(result.steps[0]!.inputs.some((input) => input.label === 'Neste lønn')).toBe(false)
  })
})

describe('classifyDailyAllowance', () => {
  it('returns comfortable when the daily amount meets or beats the recommended rate', () => {
    expect(classifyDailyAllowance(120, 100).level).toBe('comfortable')
    expect(classifyDailyAllowance(100, 100).level).toBe('comfortable')
  })

  it('returns moderate when the daily amount is 50-99% of the recommended rate', () => {
    expect(classifyDailyAllowance(60, 100).level).toBe('moderate')
  })

  it('returns tight when the daily amount is under half the recommended rate', () => {
    expect(classifyDailyAllowance(30, 100).level).toBe('tight')
  })

  it('returns unknown when there is no recommended rate to compare against', () => {
    expect(classifyDailyAllowance(100, null).level).toBe('unknown')
    expect(classifyDailyAllowance(100, 0).level).toBe('unknown')
  })
})
