import {
  DEFAULT_CURRENCY,
  DEFAULT_INFLATION_ADJUSTED,
  parseBooleanParam,
  parseCurrencyParam,
  resolveNormalizationSettings,
  type NormalizationInput,
} from '@/lib/globalSettings/params'
import type { EntityPagePublicSettings } from '../types'

export type ResolveEntityPagePublicSettingsInput = {
  readonly normalizationRaw: NormalizationInput
  readonly currencyParam?: unknown
  readonly inflationAdjustedParam?: unknown
  readonly showPeriodGrowthParam?: unknown
}

// Implemented as part of the shared SSR-safe request contract.
export function resolveEntityPagePublicSettings(
  input: ResolveEntityPagePublicSettingsInput,
): EntityPagePublicSettings {
  const normalizationRaw = input.normalizationRaw ?? 'total'
  const { normalization, forcedOverrides } = resolveNormalizationSettings(normalizationRaw)

  return {
    normalization,
    currency:
      forcedOverrides.currency
      ?? parseCurrencyParam(input.currencyParam)
      ?? DEFAULT_CURRENCY,
    inflationAdjusted:
      forcedOverrides.inflationAdjusted
      ?? parseBooleanParam(input.inflationAdjustedParam)
      ?? DEFAULT_INFLATION_ADJUSTED,
    showPeriodGrowth: parseBooleanParam(input.showPeriodGrowthParam) ?? false,
  }
}
