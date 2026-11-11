import {
  addMonths,
  subMonths,
  subDays,
  getDaysInMonth,
  startOfDay,
  differenceInCalendarDays,
} from 'date-fns'

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

// When pay actually lands for a given nominal payday: a weekend payday is
// paid the preceding Friday (the common Norwegian payroll convention) --
// Saturday -> Friday (1 day early), Sunday -> Friday (2 days early).
// Weekdays are unchanged.
function actualPayDate(nominalPayday: Date): Date {
  const weekday = nominalPayday.getDay() // 0 = Sunday, 6 = Saturday
  if (weekday === 6) return subDays(nominalPayday, 1)
  if (weekday === 0) return subDays(nominalPayday, 2)
  return nominalPayday
}

// The date the next pay actually arrives, weekend-adjusted (see
// actualPayDate). Unlike the pay period's `end`, this doesn't wait for an
// early-period override to be confirmed: a Sunday-15th payday counts down
// to Friday the 13th from the start. Once that Friday has arrived, this
// cycle's pay is in, so it moves on to the next one, even though the
// period boundary itself is still the nominal (weekend) payday.
export function getNextPayDate(
  payday: number,
  referenceDate: Date,
  overrideStart?: Date | null,
): Date {
  const { end } = getPayPeriod(payday, referenceDate, overrideStart)
  const upcoming = actualPayDate(end)
  if (upcoming > startOfDay(referenceDate)) return upcoming
  return actualPayDate(paydayInMonth(payday, addMonths(end, 1)))
}

// Days left to stretch money across before the next pay actually arrives
// (weekend-adjusted, see getNextPayDate): today counts, the pay date
// itself doesn't. If today is itself a pay date, this counts down to the
// following one rather than showing 0. By the time you'd check this,
// today's pay is what you're expected to log, not what you're still
// waiting for.
export function getDaysUntilPayday(
  payday: number,
  referenceDate: Date,
  overrideStart?: Date | null,
): number {
  return differenceInCalendarDays(
    getNextPayDate(payday, referenceDate, overrideStart),
    referenceDate,
  )
}

// Detects "your payday falls on a weekend this month" and suggests the
// preceding Friday (see actualPayDate) as the start of the new period.
// Only suggested once that Friday has actually arrived and before the
// real (weekend) payday itself, so it doesn't fire the rest of the month.
export function suggestEarlyPeriodStart(payday: number, referenceDate: Date): Date | null {
  const thisMonthPayday = paydayInMonth(payday, referenceDate)
  const earlyDate = actualPayDate(thisMonthPayday)
  if (earlyDate.getTime() === thisMonthPayday.getTime()) return null
  if (referenceDate < earlyDate || referenceDate >= thisMonthPayday) return null

  return earlyDate
}
