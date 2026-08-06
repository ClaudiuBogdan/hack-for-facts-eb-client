/** GraphQL chamber token ('camera_deputatilor' | 'senat') → display label. */
export function committeeChamberLabel(chamber: string | undefined): string {
  switch (chamber) {
    case 'camera_deputatilor':
      return 'Camera Deputaților'
    case 'senat':
      return 'Senatul României'
    default:
      return chamber ?? 'Parlament'
  }
}

const ROLE_LABELS: Record<string, string> = {
  presedinte: 'Președinte',
  vicepresedinte: 'Vicepreședinte',
  secretar: 'Secretar',
  membru: 'Membru',
}

/** Map a source committee-role token to its Romanian label (unknown → raw). */
export function committeeRoleLabel(role: string | undefined): string {
  if (!role) return 'Membru'
  return ROLE_LABELS[role.toLowerCase()] ?? role
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Format a date the source PRINTED as a calendar date — no timezone math.
 *
 * Every date reaching here is a GraphQL `Date` (`YYYY-MM-DD`) backed by a
 * Postgres `date`: a day on a calendar, with no time and no zone. Reading it as
 * an INSTANT makes the day rendered depend on where the reader sits, and it was
 * doing exactly that: `new Date('2024-12-20')` is midnight UTC, which prints as
 * 19 decembrie in America/New_York. The document path was worse — the mapper
 * welded `T00:00:00+03:00` onto the date first, so `2026-03-14` printed as
 * 13 martie in UTC, in Bucharest AND in New York, i.e. everywhere.
 *
 * Building the date in UTC and formatting it in UTC makes the day printed the
 * day stored, for every reader. Anything that is NOT a bare calendar date keeps
 * the old instant formatting — a real timestamp genuinely has a zone.
 */
export function formatCommitteeDate(value: string | undefined): string | null {
  if (!value) return null
  const parts = CALENDAR_DATE.exec(value)
  if (parts) {
    const utc = new Date(
      Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])),
    )
    if (Number.isNaN(utc.getTime())) return value
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(utc)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
