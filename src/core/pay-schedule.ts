import { addMonths, subMonths, getDaysInMonth } from 'date-fns'

export interface PayPeriod {
  start: Date
  // Exclusive: the start of the next period, i.e. the next payday.
  end: Date
}

// Clamps payday to the last valid day of the given month, e.g. a payday
// of 31 becomes the 28th/29th in February.
function paydayInMonth(payday: number, monthDate: Date): Date {
  const clampedDay = Math.min(payday, getDaysInMonth(monthDate))
  return new Date(monthDate.getFullYear(), monthDate.getMonth(), clampedDay)
}

// The pay period containing referenceDate: from the most recent payday
// up to (but not including) the next one. If referenceDate is itself the
// payday, that day starts a new period rather than ending the previous
// one -- see getDaysUntilPayday for what this means for that display.
export function getPayPeriod(payday: number, referenceDate: Date): PayPeriod {
  const thisMonthPayday = paydayInMonth(payday, referenceDate)

  const start =
    referenceDate >= thisMonthPayday
      ? thisMonthPayday
      : paydayInMonth(payday, subMonths(referenceDate, 1))

  const end = paydayInMonth(payday, addMonths(start, 1))

  return { start, end }
}

// Days until the *next* payday. If today is itself a payday, this counts
// down to the following one (today already starts its own period) rather
// than showing 0 -- by the time you'd check this, today's pay is what
// you're expected to log, not what you're still waiting for.
export function getDaysUntilPayday(payday: number, referenceDate: Date): number {
  const { end } = getPayPeriod(payday, referenceDate)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.ceil((end.getTime() - referenceDate.getTime()) / msPerDay)
}
