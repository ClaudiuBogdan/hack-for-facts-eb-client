import type { Currency, Normalization } from '@/schemas/charts'

export type NormalizationMode = 'total' | 'per_capita' | 'percent_gdp'

export type NormalizationOptions = {
  normalization?: Normalization
  currency?: Currency
  inflation_adjusted?: boolean
  show_period_growth?: boolean
}

export type NormalizedNormalizationOptions = {
  normalization: NormalizationMode
  currency: Currency
  inflation_adjusted: boolean
  show_period_growth: boolean
}

export function normalizeNormalizationOptions(options: NormalizationOptions | undefined): NormalizedNormalizationOptions {
  const normalization = options?.normalization
  const currency = options?.currency

  if (normalization === 'total_euro') {
    return {
      normalization: 'total',
      currency: 'EUR',
      inflation_adjusted: Boolean(options?.inflation_adjusted),
      show_period_growth: Boolean(options?.show_period_growth),
    }
  }

  if (normalization === 'per_capita_euro') {
    return {
      normalization: 'per_capita',
      currency: 'EUR',
      inflation_adjusted: Boolean(options?.inflation_adjusted),
      show_period_growth: Boolean(options?.show_period_growth),
    }
  }

  if (normalization === 'percent_gdp') {
    return {
      normalization: 'percent_gdp',
      currency: currency ?? 'RON',
      inflation_adjusted: false,
      show_period_growth: Boolean(options?.show_period_growth),
    }
  }

  const mode: NormalizationMode = normalization === 'per_capita' ? 'per_capita' : 'total'
  return {
    normalization: mode,
    currency: currency ?? 'RON',
    inflation_adjusted: Boolean(options?.inflation_adjusted),
    show_period_growth: Boolean(options?.show_period_growth),
  }
}


/**
 * What the Chronos budget API can apply today. Until the normalization-factor
 * tables land (scrapper program D2) it has no CPI mode and no USD rate. Every
 * surface that fetches OR labels budget values must resolve the requested
 * settings through `resolveAppliedNormalization` so that what is shown, what is
 * formatted and what is claimed (badges, explainers, share images, exports)
 * agree with what was actually applied.
 */
export const BUDGET_NORMALIZATION_CAPABILITIES = {
  inflationAdjusted: false,
  usd: false,
} as const

export type BudgetNormalizationCaveats = {
  /** Inflation adjustment was requested; the values are NOMINAL. */
  readonly inflationAdjustedUnavailable: boolean
  /** USD was requested; the values are in RON. */
  readonly currencyUnavailable: 'USD' | null
}

export type AppliedNormalization = {
  readonly normalization: NormalizationMode
  readonly currency: Currency
  readonly inflationAdjusted: boolean
  readonly showPeriodGrowth: boolean
  /** `null` when everything requested was applied. */
  readonly caveats: BudgetNormalizationCaveats | null
}

/**
 * Resolve requested normalization settings to what the budget API applies.
 * Rules: `percent_gdp` ignores currency and inflation (no caveat for them);
 * the legacy euro composites pin EUR (a USD request is moot there); otherwise
 * USD degrades to RON and inflation adjustment to nominal, each with a caveat.
 */
export function resolveAppliedNormalization(options: NormalizationOptions | undefined): AppliedNormalization {
  const normalized = normalizeNormalizationOptions(options)
  const isEuroComposite = options?.normalization === 'total_euro' || options?.normalization === 'per_capita_euro'
  const currencyMatters = normalized.normalization !== 'percent_gdp' && !isEuroComposite
  const inflationMatters = normalized.normalization !== 'percent_gdp'

  const currencyUnavailable: 'USD' | null =
    currencyMatters && normalized.currency === 'USD' && !BUDGET_NORMALIZATION_CAPABILITIES.usd ? 'USD' : null
  const inflationAdjustedUnavailable =
    inflationMatters && normalized.inflation_adjusted && !BUDGET_NORMALIZATION_CAPABILITIES.inflationAdjusted

  return {
    normalization: normalized.normalization,
    currency: currencyUnavailable === null ? normalized.currency : 'RON',
    inflationAdjusted: inflationAdjustedUnavailable ? false : normalized.inflation_adjusted,
    showPeriodGrowth: normalized.show_period_growth,
    caveats:
      currencyUnavailable !== null || inflationAdjustedUnavailable
        ? { inflationAdjustedUnavailable, currencyUnavailable }
        : null,
  }
}
