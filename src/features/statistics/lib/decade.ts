import type { StatisticsDecadeObservation } from '@/schemas/statistics'

export interface DecadeCountyChange {
  readonly countyCode: string
  readonly countyName: string | null
  readonly startValue: number
  readonly endValue: number
  /** Percent change end vs start, e.g. -12.4 for a 12.4% decline. */
  readonly pctChange: number
}

/** Measured 2026-08-26 on the live corpus: 42 NUTS3 rows per endpoint year. */
export const NUTS3_COUNTY_COUNT = 42

export interface DecadeStory {
  readonly startYear: number
  readonly endYear: number
  /** Top declines, most negative first. */
  readonly declines: readonly DecadeCountyChange[]
  /** Top growth, most positive first. */
  readonly gains: readonly DecadeCountyChange[]
  /** Counties dropped because an endpoint year is missing — never zero-filled. */
  readonly excludedCount: number
  /** Counties that had both endpoints. */
  readonly rankedCount: number
  /** Largest |pctChange| across the ranked set (fill-bar scale). */
  readonly maxAbsChange: number
}

const TOP_N = 5

/**
 * Builds the decade ranking from endpoint-year county rows.
 *
 * A county missing either endpoint (no row, or a row with a null value) is
 * EXCLUDED and counted, never treated as zero — absence is not a decline.
 */
export function buildDecadeStory(params: {
  readonly rows: readonly StatisticsDecadeObservation[]
  readonly startYear: number
  readonly endYear: number
}): DecadeStory {
  const { rows, startYear, endYear } = params

  const byCounty = new Map<
    string,
    { name: string | null; start: number | null; end: number | null }
  >()

  for (const row of rows) {
    if (row.year !== startYear && row.year !== endYear) continue
    const entry = byCounty.get(row.countyCode) ?? {
      name: row.countyName,
      start: null,
      end: null,
    }
    if (row.countyName && !entry.name) entry.name = row.countyName
    const parsed = row.value === null ? Number.NaN : Number.parseFloat(row.value)
    const value = Number.isFinite(parsed) ? parsed : null
    if (row.year === startYear) entry.start = value
    if (row.year === endYear) entry.end = value
    byCounty.set(row.countyCode, entry)
  }

  const ranked: DecadeCountyChange[] = []

  for (const [countyCode, entry] of byCounty) {
    if (entry.start === null || entry.end === null || entry.start === 0) {
      continue
    }
    ranked.push({
      countyCode,
      countyName: entry.name,
      startValue: entry.start,
      endValue: entry.end,
      pctChange: ((entry.end - entry.start) / entry.start) * 100,
    })
  }

  const byChangeAsc = [...ranked].sort((a, b) => a.pctChange - b.pctChange)
  const declines = byChangeAsc.filter((c) => c.pctChange < 0).slice(0, TOP_N)
  const gains = byChangeAsc
    .filter((c) => c.pctChange > 0)
    .reverse()
    .slice(0, TOP_N)

  let maxAbsChange = 0
  for (const change of ranked) {
    maxAbsChange = Math.max(maxAbsChange, Math.abs(change.pctChange))
  }

  return {
    startYear,
    endYear,
    declines,
    gains,
    // Counties ABSENT from the payload count as excluded too — occupancy of
    // the response alone would under-report the gaps.
    excludedCount: Math.max(NUTS3_COUNTY_COUNT - ranked.length, 0),
    rankedCount: ranked.length,
    maxAbsChange,
  }
}
