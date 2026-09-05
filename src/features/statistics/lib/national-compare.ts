import type { StatisticsLatestValue } from '@/schemas/statistics'

export type NationalComparison =
  | {
      /** LAU value as a share of the national value (absolute-unit datasets). */
      readonly kind: 'share'
      readonly shareOfCountryPct: number
      readonly nationalPeriod: string | null
    }
  | {
      /** Rate/percent datasets: shares are meaningless, show the national rate. */
      readonly kind: 'reference'
      readonly nationalValue: string
      readonly unitSymbol: string | null
      readonly nationalPeriod: string | null
    }

/**
 * The one-line „față de România" comparison for a „Locul tău" tile.
 *
 * Only compares when both sides report the SAME period (comparing a 2024 LAU
 * headcount against a 2025 national one would fabricate a share). Returns null
 * when periods differ or either value is missing/non-numeric.
 */
export function buildNationalComparison(params: {
  readonly local: StatisticsLatestValue
  readonly national: StatisticsLatestValue | undefined
}): NationalComparison | null {
  const { local, national } = params
  if (!local.hasData || local.matchStrategy === 'AMBIGUOUS_GEOGRAPHY' ||
      !national?.hasData || national.matchStrategy === 'AMBIGUOUS_GEOGRAPHY') return null
  if (!national || national.value === null || local.value === null) return null
  if (local.period === null || national.period === null) return null
  if (local.period !== national.period) return null

  if (local.unitSymbol === '%') {
    return {
      kind: 'reference',
      nationalValue: national.value,
      unitSymbol: national.unitSymbol,
      nationalPeriod: national.period,
    }
  }

  const localValue = Number.parseFloat(local.value)
  const nationalValue = Number.parseFloat(national.value)
  if (!Number.isFinite(localValue) || !Number.isFinite(nationalValue)) return null
  if (nationalValue === 0) return null

  return {
    kind: 'share',
    shareOfCountryPct: (localValue / nationalValue) * 100,
    nationalPeriod: national.period,
  }
}
