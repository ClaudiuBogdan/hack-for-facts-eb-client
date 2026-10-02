import { t } from '@lingui/core/macro'
import { formatDecimal, type DecimalLocale } from '@/lib/exact-decimal'
import { companyMetricUnit, type CompanyAnalysisRangeInput, type CompanyAnalysisScope } from '@/schemas/company-analytics'
import { caenBasisLabel, countyLabel, flagLabel, metricLabel, sizeBandLabel } from './company-analytics-text'
import { caenToken } from './company-analytics-url'

/**
 * Each filter of a scope in a few words, for the chips under the headline
 * and a saved chart's filter list: the field, what it keeps, its unknown
 * group named as such.
 */

export type ScopeField = keyof CompanyAnalysisScope

export interface ScopeChip {
  readonly field: ScopeField
  readonly text: string
}

export interface ScopeNames {
  /** Locality names by SIRUTA, where read. */
  readonly uats?: ReadonlyMap<string, string>
  /** Observed status labels by code, where read. */
  readonly statuses?: ReadonlyMap<string, string>
}

function joined(values: readonly string[], max = 3): string {
  return values.length <= max ? values.join(', ') : t`${values.slice(0, max).join(', ')} și încă ${values.length - max}`
}

function boundText(value: string, range: CompanyAnalysisRangeInput, locale: DecimalLocale): string {
  const unit = companyMetricUnit(range.metric) === 'RON' ? t`lei` : t`salariați`
  return `${formatDecimal(value, locale)} ${unit}`
}

export function rangeText(range: CompanyAnalysisRangeInput, locale: DecimalLocale): string {
  const label = metricLabel(range.metric)
  if (range.min !== undefined && range.max !== undefined) return t`${label}: între ${boundText(range.min, range, locale)} și ${boundText(range.max, range, locale)}`
  if (range.min !== undefined) return t`${label}: cel puțin ${boundText(range.min, range, locale)}`
  return t`${label}: cel mult ${boundText(range.max ?? '0', range, locale)}`
}

export function scopeChips(scope: CompanyAnalysisScope, locale: DecimalLocale, names: ScopeNames = {}): readonly ScopeChip[] {
  const chips: ScopeChip[] = []
  const add = (field: ScopeField, text: string) => chips.push({ field, text })
  const cuis = scope.cuis ?? []
  if (cuis.length === 1) add('cuis', t`CUI ${cuis[0] ?? ''}`)
  else if (cuis.length > 1) add('cuis', t`${cuis.length} firme alese`)
  if (scope.county) {
    const counties = (scope.county.in ?? []).map(countyLabel)
    add('county', joined([...counties, ...(scope.county.includeUnknown ? [t`județ necunoscut`] : [])]))
  }
  if (scope.uat) {
    const uats = (scope.uat.in ?? []).map((code) => names.uats?.get(code) ?? t`SIRUTA ${code}`)
    add('uat', joined([...uats, ...(scope.uat.includeUnknown ? [t`localitate neidentificată`] : [])]))
  }
  if (scope.legalForms) add('legalForms', t`formă juridică: ${joined(scope.legalForms)}`)
  if (scope.observedStatus) {
    const statuses = (scope.observedStatus.in ?? []).map((code) => names.statuses?.get(code) ?? code)
    add('observedStatus', t`stare ONRC observată: ${joined([...statuses, ...(scope.observedStatus.includeUnknown ? [t`necunoscută`] : [])])}`)
  }
  if (scope.vatPayer) add('vatPayer', t`plătitor de TVA: ${scope.vatPayer.map(flagLabel).join(', ')}`)
  if (scope.fiscallyInactive) add('fiscallyInactive', t`inactiv fiscal: ${scope.fiscallyInactive.map(flagLabel).join(', ')}`)
  if (scope.mainCaen) add('mainCaen', t`CAEN principal: ${joined(scope.mainCaen.map((selector) => (selector.revision ? caenToken(selector) : t`${selector.code} (revizie necunoscută)`)))}`)
  if (scope.mainCaenBasis) add('mainCaenBasis', joined(scope.mainCaenBasis.map(caenBasisLabel)))
  if (scope.filing) add('filing', scope.filing === 'FILED' ? t`au depus situații financiare` : t`nu au depus situații financiare`)
  for (const range of scope.financialRanges ?? []) add('financialRanges', rangeText(range, locale))
  if (scope.employeeSizeBands) add('employeeSizeBands', joined(scope.employeeSizeBands.map(sizeBandLabel)))
  return chips
}

/** The scope without one field — for a range, without that measure's range only. */
export function withoutChip(scope: CompanyAnalysisScope, chip: ScopeChip, locale: DecimalLocale): CompanyAnalysisScope {
  if (chip.field === 'financialRanges') {
    const ranges = (scope.financialRanges ?? []).filter((range) => rangeText(range, locale) !== chip.text)
    return { ...scope, financialRanges: ranges.length > 0 ? ranges : undefined }
  }
  return { ...scope, [chip.field]: undefined }
}
