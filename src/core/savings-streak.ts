import { subDays } from 'date-fns'
import type { CalculationResult } from './types/calculation-result'
import { getPayPeriod, type PayPeriod } from './pay-schedule'
import { isWithinRange } from './date-range'
import { formatShortDate } from './format'

export interface SavingsStreak {
  current: CalculationResult<number>
  // The best run ever, for badges: unlike `current` it doesn't drop back
  // when a period goes by without saving.
  longest: number
}

function periodLabel(period: PayPeriod): string {
  return `${formatShortDate(period.start)} – ${formatShortDate(subDays(period.end, 1))}`
}

function periodsLabel(count: number): string {
  return count === 1 ? 'periode' : 'perioder'
}

// A streak counts pay periods in a row with at least one contribution to
// a savings goal. The period in progress only adds to it once something
// is saved in it -- but it doesn't break it either until it's over,
// since there's still time to save before payday.
export function calculateSavingsStreak(
  payday: number,
  referenceDate: Date,
  contributionDates: readonly string[],
): SavingsStreak {
  const dates = contributionDates.map((date) => new Date(date))
  const earliest = dates.length ? Math.min(...dates.map((date) => date.getTime())) : null

  // Newest first: the current period, then back far enough to cover the
  // earliest contribution, so `longest` sees the whole history.
  const periods: PayPeriod[] = [getPayPeriod(payday, referenceDate)]
  while (earliest != null && periods[periods.length - 1]!.start.getTime() > earliest) {
    periods.push(getPayPeriod(payday, subDays(periods[periods.length - 1]!.start, 1)))
  }

  const hasSaving = periods.map((period) =>
    dates.some((date) => isWithinRange(date, period.start, period.end)),
  )

  const firstCounted = hasSaving[0] ? 0 : 1
  let current = 0
  while (hasSaving[firstCounted + current]) current++

  let longest = 0
  let run = 0
  for (const saved of hasSaving) {
    run = saved ? run + 1 : 0
    longest = Math.max(longest, run)
  }

  let summary: string
  if (!dates.length) {
    summary = 'Ingen sparing lagt inn ennå. Det første innskuddet på et sparemål starter streaken.'
  } else if (current === 0) {
    summary =
      'Forrige lønningsperiode gikk uten sparing, så streaken starter på nytt med neste innskudd.'
  } else {
    summary = `${current} lønningsperiode${current === 1 ? '' : 'r'} på rad med minst ett innskudd på et sparemål.`
    if (!hasSaving[0]) {
      summary +=
        ' Denne perioden mangler fortsatt et innskudd – spar før lønningsdagen for å holde streaken.'
    }
  }

  // The periods the streak is made of, plus the one that ended it (or
  // the current one still waiting for a contribution).
  const shown = periods.slice(0, Math.min(periods.length, firstCounted + current + 1))

  return {
    current: {
      value: current,
      unit: periodsLabel(current),
      model: 'savings-streak-v1',
      summary,
      steps: [
        {
          label: 'Lønningsperioder med sparing',
          formula: 'perioder på rad med minst ett innskudd',
          inputs: shown.map((period, index) => ({
            label: periodLabel(period),
            value: hasSaving[index] ? 'spart ✓' : index === 0 ? 'ikke ennå' : 'ingen sparing',
          })),
          result: current,
          unit: periodsLabel(current),
        },
      ],
    },
    longest,
  }
}
