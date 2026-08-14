import { addMonths, subMonths, subDays, getDaysInMonth } from 'date-fns'

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
//
// `overrideStart` is a one-time, self-expiring "my pay actually arrived
// early" override (e.g. payday falls on a weekend) -- if it's on/before
// referenceDate and before the next regular payday after it, it replaces
// that regular boundary entirely (the period runs override -> next
// regular payday, not just a truncated stub). Once referenceDate moves
// past that boundary, the override is stale and the formula quietly
// resumes on its own -- no explicit cleanup needed.
export function getPayPeriod(
  payday: number,
  referenceDate: Date,
  overrideStart?: Date | null,
): PayPeriod {
  if (overrideStart) {
    const overriddenEnd = paydayInMonth(payday, addMonths(overrideStart, 1))
    if (referenceDate >= overrideStart && referenceDate < overriddenEnd) {
      return { start: overrideStart, end: overriddenEnd }
    }
  }

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
export function getDaysUntilPayday(
  payday: number,
  referenceDate: Date,
  overrideStart?: Date | null,
): number {
  const { end } = getPayPeriod(payday, referenceDate, overrideStart)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.ceil((end.getTime() - referenceDate.getTime()) / msPerDay)
}

// Detects "your payday falls on a weekend this month" and suggests the
// preceding Friday as the likely actual pay date (the common Norwegian
// payroll convention) -- Saturday payday -> Friday (1 day early), Sunday
// payday -> Friday (2 days early). Only suggested once that Friday has
// actually arrived and before the real (weekend) payday itself, so it
// doesn't fire the rest of the month.
export function suggestEarlyPeriodStart(payday: number, referenceDate: Date): Date | null {
  const thisMonthPayday = paydayInMonth(payday, referenceDate)
  const weekday = thisMonthPayday.getDay() // 0 = Sunday, 6 = Saturday

  let shiftDays: number
  if (weekday === 6) shiftDays = 1
  else if (weekday === 0) shiftDays = 2
  else return null

  const earlyDate = subDays(thisMonthPayday, shiftDays)
  if (referenceDate < earlyDate || referenceDate >= thisMonthPayday) return null

  return earlyDate
}
