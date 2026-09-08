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


/** Native entity requests apply admitted monetary factors with exact-year coverage. */
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

/** Resolve aliases and GDP exclusivity; missing factor coverage is handled by the API. */
export function resolveAppliedNormalization(options: NormalizationOptions | undefined): AppliedNormalization {
  const normalized = normalizeNormalizationOptions(options)
  return {
    normalization: normalized.normalization,
    currency: normalized.currency,
    inflationAdjusted: normalized.inflation_adjusted,
    showPeriodGrowth: normalized.show_period_growth,
    caveats: null,
  }
}
