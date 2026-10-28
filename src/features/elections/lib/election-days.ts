import type { ElectionEvent, ElectionOccurrence } from '@/schemas/elections-catalog'

/** An event's ballot days, earliest first. */
export function ballotDaysOf(event: ElectionEvent): readonly ElectionOccurrence[] {
  return [...event.occurrences].sort((left, right) => left.ballotDate.localeCompare(right.ballotDate))
}

/**
 * The ballot day an address names by its date (a day's identity within its
 * event); an address that names none gets the event's first day. `null`: the
 * event has no day on that date, or no day at all.
 */
export function selectBallotDay(event: ElectionEvent, date: string | undefined): ElectionOccurrence | null {
  if (date !== undefined) return event.occurrences.find((day) => day.ballotDate === date) ?? null
  return ballotDaysOf(event)[0] ?? null
}
