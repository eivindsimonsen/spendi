import { differenceInCalendarDays } from 'date-fns'
import { formatCurrencyNOK } from './format'

export interface MotivationInput {
  // "Dere" in a shared plan, "du" in your own.
  isShared: boolean
  totalSaved: number
  currentStreak: number
  goals: readonly { name: string; targetAmount: number; savedAmount: number }[]
}

// Any fixed date works -- it only turns "today" into a day number.
const EPOCH = new Date(2026, 0, 1)

// A short encouraging line for the Overview, built from whatever is true
// right now. Picks one per calendar day rather than per render, so it
// doesn't change every time the page is opened during the same day, and
// every message restates a figure shown with its explanation nearby.
export function pickMotivation(input: MotivationInput, referenceDate: Date): string | null {
  const subject = input.isShared ? 'Dere' : 'Du'
  const messages: string[] = []

  if (input.totalSaved > 0) {
    messages.push(`${subject} har spart ${formatCurrencyNOK(input.totalSaved)} til sammen 💜`)
  }

  if (input.currentStreak >= 2) {
    messages.push(`🔥 ${input.currentStreak} perioder på rad – ikke bryt streaken nå!`)
  }

  const closest = input.goals
    .filter((goal) => goal.savedAmount > 0 && goal.savedAmount < goal.targetAmount)
    .sort((a, b) => a.targetAmount - a.savedAmount - (b.targetAmount - b.savedAmount))[0]
  if (closest) {
    const remaining = closest.targetAmount - closest.savedAmount
    messages.push(`Bare ${formatCurrencyNOK(remaining)} igjen til «${closest.name}» 🎯`)
  }

  const completed = input.goals.filter(
    (goal) => goal.targetAmount > 0 && goal.savedAmount >= goal.targetAmount,
  ).length
  if (completed > 0) {
    messages.push(`${subject} har nådd ${completed} sparemål – sterkt jobba! 🏆`)
  }

  if (!messages.length) {
    return input.goals.length ? 'Hver krone teller – start med et lite innskudd i dag 🌱' : null
  }

  const day = differenceInCalendarDays(referenceDate, EPOCH)
  const index = ((day % messages.length) + messages.length) % messages.length
  return messages[index] ?? null
}
