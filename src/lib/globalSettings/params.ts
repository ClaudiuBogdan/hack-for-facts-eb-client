import type { Currency, Normalization } from '@/schemas/charts'

const VALID_CURRENCIES: readonly Currency[] = ['RON', 'EUR', 'USD']

// Extended normalization type that includes legacy euro variants
export type NormalizationInput = Normalization | 'total_euro' | 'per_capita_euro'

export type ForcedOverrides = {
  currency?: Currency
  inflationAdjusted?: boolean
}

export function hasForcedOverrides(
  forcedOverrides: ForcedOverrides | undefined,
): forcedOverrides is ForcedOverrides {
  return (
    forcedOverrides?.currency !== undefined ||
    forcedOverrides?.inflationAdjusted !== undefined
  )
}

export type ResolvedSettings = {
  normalization: Normalization
  forcedOverrides: ForcedOverrides
}

/**
 * Resolves normalization and computes forced overrides in one pass.
 * Prevents drift between loader and client by centralizing logic.
 */
export function resolveNormalizationSettings(normalizationRaw: NormalizationInput): ResolvedSettings {
  // Normalize legacy euro variants
  const normalization: Normalization =
    normalizationRaw === 'total_euro' ? 'total'
      : normalizationRaw === 'per_capita_euro' ? 'per_capita'
        : normalizationRaw

  // Compute forced overrides based on raw input
  const forcedOverrides: ForcedOverrides = {
    currency: (normalizationRaw === 'total_euro' || normalizationRaw === 'per_capita_euro')
      ? 'EUR'
      : undefined,
    inflationAdjusted: normalization === 'percent_gdp' ? false : undefined,
  }

  return { normalization, forcedOverrides }
}

export function parseCurrencyParam(value: unknown): Currency | undefined {
  if (typeof value === 'string' && VALID_CURRENCIES.includes(value as Currency)) {
    return value as Currency
  }
  return undefined
}

export function parseBooleanParam(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export const DEFAULT_CURRENCY: Currency = 'RON'
export const DEFAULT_INFLATION_ADJUSTED = false
