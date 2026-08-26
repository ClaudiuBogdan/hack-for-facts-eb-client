import type { StatisticsExampleObservation } from '@/schemas/statistics'

export interface LandingExample {
  /**
   * Latest year in which EVERY territory reports a value — `null` when
   * ambiguity rejected every candidate year (the loud-degradation shape:
   * `rows` is empty, `ambiguousCellCount` says why).
   */
  readonly year: number | null
  /** One row per territory, ordered NATIONAL → NUTS3 → LAU. */
  readonly rows: readonly StatisticsExampleObservation[]
  readonly unitSymbol: string | null
  /** LAU value as a share of the county value, percent, when computable. */
  readonly lauShareOfCounty: number | null
  /**
   * (territory, year) pairs REJECTED because they carried multiple cells.
   * Zero today (FOM104D has no classification dimensions); if the dataset
   * ever grows one upstream, this must be LOUD — the caller logs it and the
   * card shows a degraded note, never a silent skip.
   */
  readonly ambiguousCellCount: number
}

const LEVEL_ORDER: Record<string, number> = {
  NATIONAL: 0,
  NUTS1: 1,
  NUTS2: 2,
  NUTS3: 3,
  LAU: 4,
}

/**
 * Picks the latest COMMON year across the example territories and shapes the
 * card rows. Returns null when no year covers every territory — the card
 * renders nothing rather than a mixed-year comparison.
 */
export function buildLandingExample(
  rows: readonly StatisticsExampleObservation[],
): LandingExample | null {
  const territoryCodes = new Set(rows.map((row) => row.code))
  if (territoryCodes.size < 2) return null

  // One row per (territory, year) or the pair is REJECTED: the example query
  // cannot pin classifications server-side (FOM104D has none, and a value-only
  // filter on a classification-less dataset would exclude every row), so a
  // duplicate here means an ambiguous cell — last-write-wins would silently
  // mix classification slices.
  const byYear = new Map<number, Map<string, StatisticsExampleObservation>>()
  const ambiguous = new Set<string>()
  for (const row of rows) {
    if (row.value === null) continue
    const key = `${row.year}:${row.code}`
    const yearRows = byYear.get(row.year) ?? new Map<string, StatisticsExampleObservation>()
    if (yearRows.has(row.code)) {
      ambiguous.add(key)
    }
    yearRows.set(row.code, row)
    byYear.set(row.year, yearRows)
  }
  for (const key of ambiguous) {
    const [yearPart, code] = key.split(':')
    byYear.get(Number(yearPart))?.delete(code)
  }

  const commonYears = [...byYear.entries()]
    .filter(([, yearRows]) => yearRows.size === territoryCodes.size)
    .map(([year]) => year)
    .sort((a, b) => b - a)

  const ambiguousCellCount = ambiguous.size

  const year = commonYears[0]
  if (year === undefined) {
    // No silent caps: when ambiguity is what emptied the candidate years, the
    // caller must still learn about it (log + visible degraded note) — only
    // plain lack of coverage stays a quiet null.
    if (ambiguousCellCount > 0) {
      return {
        year: null,
        rows: [],
        unitSymbol: null,
        lauShareOfCounty: null,
        ambiguousCellCount,
      }
    }
    return null
  }

  const yearRows = byYear.get(year)
  if (!yearRows) return null

  const ordered = [...yearRows.values()].sort(
    (a, b) => (LEVEL_ORDER[a.level ?? ''] ?? 9) - (LEVEL_ORDER[b.level ?? ''] ?? 9),
  )

  const county = ordered.find((row) => row.level === 'NUTS3')
  const lau = ordered.find((row) => row.level === 'LAU')
  const countyValue = county?.value === null || county?.value === undefined ? Number.NaN : Number.parseFloat(county.value)
  const lauValue = lau?.value === null || lau?.value === undefined ? Number.NaN : Number.parseFloat(lau.value)
  const lauShareOfCounty =
    Number.isFinite(countyValue) && Number.isFinite(lauValue) && countyValue !== 0
      ? (lauValue / countyValue) * 100
      : null

  return {
    year,
    rows: ordered,
    unitSymbol: ordered.find((row) => row.unitSymbol !== null)?.unitSymbol ?? null,
    lauShareOfCounty,
    ambiguousCellCount,
  }
}
