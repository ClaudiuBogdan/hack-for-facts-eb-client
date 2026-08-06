/**
 * A calendar date must render as the day the source printed — for every reader.
 *
 * The committee page renders GraphQL `Date` values (`YYYY-MM-DD`, backed by a
 * Postgres `date`). Those have no time and no zone, and both paths into this
 * formatter used to give them one:
 *
 *  - the roster path passed the bare date, and `new Date('2024-12-20')` is
 *    midnight UTC, which formats as 19 decembrie in America/New_York;
 *  - the documents path went through the mapper's `toIsoDate`, which welded
 *    `T00:00:00+03:00` on first — so `2026-03-14` formatted as 13 martie in UTC,
 *    in Europe/Bucharest AND in America/New_York, i.e. everywhere.
 *
 * `TZ` cannot be changed reliably mid-process (Node caches the zone for `Intl`),
 * so the guarantee is built into the formatter instead of asserted around it: it
 * pins `timeZone: 'UTC'` for calendar dates, which makes the output independent
 * of the runner's zone. These assertions are therefore exact, and the suite is
 * run under a non-UTC TZ in CI-equivalent terms by construction — the same
 * string is produced whatever `TZ` the runner has.
 */
import { describe, expect, it } from 'vitest'

import { formatCommitteeDate } from './committee-format'

describe('formatCommitteeDate — calendar dates carry no timezone', () => {
  it('renders the day the source printed, not the day the reader is in', () => {
    expect(formatCommitteeDate('2026-03-14')).toBe('14 martie 2026')
    expect(formatCommitteeDate('2024-12-20')).toBe('20 decembrie 2024')
    // 1 January is the case an off-by-one moves into the PREVIOUS YEAR.
    expect(formatCommitteeDate('2025-01-01')).toBe('1 ianuarie 2025')
  })

  it('is independent of the runner timezone', () => {
    // The formatter pins UTC for calendar dates, so this holds wherever the
    // suite runs. Stated as an assertion so the guarantee is not just a comment:
    // a future edit dropping `timeZone: 'UTC'` makes this disagree in any zone
    // behind UTC, and the exact-day assertions above fail outright.
    const rendered = formatCommitteeDate('2026-03-14')
    const utc = new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(2026, 2, 14)))
    expect(rendered).toBe(utc)
  })

  it('never reproduces the +03:00 welding that shifted the day everywhere', () => {
    // The retired path: `2026-03-14` → `2026-03-14T00:00:00+03:00` → 13 martie.
    const welded = new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date('2026-03-14T00:00:00+03:00'))
    expect(welded).toBe('13 martie 2026')
    expect(formatCommitteeDate('2026-03-14')).not.toBe(welded)
  })

  it('still formats a genuine timestamp as an instant', () => {
    // A real timestamp DOES have a zone; only bare calendar dates are pinned.
    expect(formatCommitteeDate('2026-03-14T22:00:00Z')).toMatch(/martie 2026$/u)
  })

  it('passes an unparseable value through rather than throwing', () => {
    expect(formatCommitteeDate('x')).toBe('x')
    expect(formatCommitteeDate(undefined)).toBeNull()
  })
})
