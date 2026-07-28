// Whether `date` falls within [start, end) -- start inclusive, end
// exclusive. Matches how a period's boundary works everywhere in this
// app: `end` is the next payday/month, which is itself the start of the
// following period, not part of the current one.
export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date < end
}
