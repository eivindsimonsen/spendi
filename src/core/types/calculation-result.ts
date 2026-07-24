// Every pure calculation in src/core returns this shape instead of a bare
// number, so the UI can show an info icon next to any calculated/estimated
// value that reveals exactly how it was produced (see ExplainableValue.vue).

export interface CalculationInput {
  label: string
  value: number | string
  unit?: string
}

export interface CalculationStep {
  label: string
  // Human-readable formula, e.g. "monthly salary × payments per year" —
  // not an executable expression.
  formula?: string
  inputs: CalculationInput[]
  result: number
}

export interface CalculationResult<T = number> {
  value: T
  // Identifies which formula/model produced this value, e.g.
  // "manual-entry" or "norwegian-pay-schedule-v1".
  model: string
  summary: string
  steps: CalculationStep[]
}
