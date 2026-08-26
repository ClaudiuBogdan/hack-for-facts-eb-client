import type { StatisticsExampleObservation } from '@/schemas/statistics'

export interface LandingExample {
  /** Latest year in which EVERY territory reports a value. */
  readonly year: number
  /** One row per territory, ordered NATIONAL → NUTS3 → LAU. */
  readonly rows: readonly StatisticsExampleObservation[]
  readonly unitSymbol: string | null
  /** LAU value as a share of the county value, percent, when computable. */
  readonly lauShareOfCounty: number | null
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

  const byYear = new Map<number, Map<string, StatisticsExampleObservation>>()
  for (const row of rows) {
    if (row.value === null) continue
    const yearRows = byYear.get(row.year) ?? new Map()
    yearRows.set(row.code, row)
    byYear.set(row.year, yearRows)
  }

  const commonYears = [...byYear.entries()]
    .filter(([, yearRows]) => yearRows.size === territoryCodes.size)
    .map(([year]) => year)
    .sort((a, b) => b - a)

  const year = commonYears[0]
  if (year === undefined) return null

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
  }
}
