/**
 * The date of the most recent vote we hold, for the header's meta line.
 *
 * Returns null rather than a placeholder when the signal is absent, so the
 * header simply omits the clause instead of printing "ultimul vot: —".
 */
export function formatParliamentVoteDay(
  value: string | undefined,
): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    // Vote dates are date-only values; formatting them in browser time shifts
    // the day for anyone west of Bucharest.
    timeZone: 'UTC',
  }).format(date)
}
