import { format } from 'date-fns'

// Single source of truth for NOK currency formatting, so no two screens
// round or display amounts differently.
const currencyFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  maximumFractionDigits: 0,
})

export function formatCurrencyNOK(amount: number): string {
  return currencyFormatter.format(amount)
}

// "Today" as a yyyy-MM-dd string, in local time. Deliberately not
// `new Date().toISOString().slice(0, 10)` -- toISOString() converts to
// UTC, which silently resolves to *yesterday's* date for the first
// hour(s) after local midnight in Norway.
export function todayLocalDate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

// Compact "15. jul"-style date, used wherever a date needs to read
// briefly (period ranges, transaction rows, trend charts).
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

// Short month name for a "yyyy-MM" key, e.g. a chart axis label.
export function formatMonthLabel(monthKey: string): string {
  const [year, monthNumber] = monthKey.split('-')
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('nb-NO', {
    month: 'short',
  })
}

// Full month name for a date, e.g. "juni" -- used where a period only
// needs to be identified by which month it belongs to (a shared plan's
// members can have different paydays, so a payday-to-payday date range
// isn't a meaningful label for everyone -- the month it fell in is).
export function formatMonthName(date: Date): string {
  return date.toLocaleDateString('nb-NO', { month: 'long' })
}
