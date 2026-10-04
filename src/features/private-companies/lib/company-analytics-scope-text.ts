import { t } from '@lingui/core/macro'
import { formatDecimal, type DecimalLocale } from '@/lib/exact-decimal'
import { companyMetricUnit, type CompanyAnalysisDimension, type CompanyAnalysisKeyFilterInput, type CompanyAnalysisRangeInput, type CompanyAnalysisScope } from '@/schemas/company-analytics'
import { basisGroupLabel, caenBasisLabel, consensusKeysOf, countyLabel, flagLabel, metricLabel, sizeBandLabel } from './company-analytics-text'
import { caenToken } from './company-analytics-url'

/**
 * Each filter of a scope in a few words, for the chips under the headline
 * and a saved chart's filter list: the field, what it keeps, a consensus
 * field's companies without a common value named by why. The ONRC
 * observations (one identifier) read apart from the consensus fields.
 */

export type ScopeField = keyof CompanyAnalysisScope

export interface ScopeChip {
  readonly field: ScopeField
  /** For `onrc`: the observations on one identifier (`match`) or the exclusions (`exclude`), each its own chip. */
  readonly part?: 'match' | 'exclude'
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

/** A consensus selector's keys in words: its values by name, each basis bucket by why, every company without a value as such. */
function consensusText(filter: CompanyAnalysisKeyFilterInput, dimension: CompanyAnalysisDimension, nameOf: (code: string) => string): string {
  const { values, bases } = consensusKeysOf(filter.in ?? [])
  const none = dimension === 'COUNTY' ? t`fără județ comun (orice motiv)` : dimension === 'UAT' ? t`fără localitate comună (orice motiv)` : t`fără stare comună (orice motiv)`
  return joined([...values.map(nameOf), ...bases.map((basis) => basisGroupLabel(dimension, basis)), ...(filter.includeUnknown ? [none] : [])])
}

export function scopeChips(scope: CompanyAnalysisScope, locale: DecimalLocale, names: ScopeNames = {}): readonly ScopeChip[] {
  const chips: ScopeChip[] = []
  const add = (field: ScopeField, text: string, part?: ScopeChip['part']) => chips.push({ field, text, ...(part ? { part } : {}) })
  const cuis = scope.cuis ?? []
  if (cuis.length === 1) add('cuis', t`CUI ${cuis[0] ?? ''}`)
  else if (cuis.length > 1) add('cuis', t`${cuis.length} firme alese`)
  if (scope.county) add('county', consensusText(scope.county, 'COUNTY', countyLabel))
  if (scope.uat) add('uat', consensusText(scope.uat, 'UAT', (code) => names.uats?.get(code) ?? t`SIRUTA ${code}`))
  if (scope.legalForms) add('legalForms', t`formă juridică: ${joined(scope.legalForms)}`)
  if (scope.observedStatus) add('observedStatus', t`stare comună în ediția ONRC: ${consensusText(scope.observedStatus, 'OBSERVED_STATUS', (code) => names.statuses?.get(code) ?? code)}`)
  const onrc = scope.onrc
  if (onrc) {
    const status = (onrc.status ?? []).map((code) => names.statuses?.get(code) ?? code)
    const match = [
      ...(status.length > 0 ? [t`starea ${joined(status)}`] : []),
      ...((onrc.county ?? []).length > 0 ? [t`județul ${joined((onrc.county ?? []).map(countyLabel))}`] : []),
      ...((onrc.caenCode ?? []).length > 0 ? [t`CAEN ${joined(onrc.caenCode ?? [])} (orice revizie)`] : []),
      ...((onrc.onrcCaen ?? []).length > 0 ? [t`CAEN exact ${joined(onrc.onrcCaen ?? [])}`] : []),
    ]
    if (match.length > 0) add('onrc', t`aceeași înscriere ONRC: ${match.join(' · ')}`, 'match')
    const exclude = onrc.exclude
    const excluded = [
      ...((exclude?.status ?? []).length > 0 ? [t`starea ${joined((exclude?.status ?? []).map((code) => names.statuses?.get(code) ?? code))}`] : []),
      ...((exclude?.caenCode ?? []).length > 0 ? [t`CAEN ${joined(exclude?.caenCode ?? [])}`] : []),
      ...((exclude?.county ?? []).length > 0 ? [t`județul ${joined((exclude?.county ?? []).map(countyLabel))}`] : []),
      ...((exclude?.legalForm ?? []).length > 0 ? [t`forma ${joined(exclude?.legalForm ?? [])}`] : []),
    ]
    if (excluded.length > 0) add('onrc', t`fără, după dovezi complete ONRC: ${excluded.join(' · ')}`, 'exclude')
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

/** The scope without one field — for a range, without that measure's range only; for the ONRC observations, without that chip's part only. */
export function withoutChip(scope: CompanyAnalysisScope, chip: ScopeChip, locale: DecimalLocale): CompanyAnalysisScope {
  if (chip.field === 'financialRanges') {
    const ranges = (scope.financialRanges ?? []).filter((range) => rangeText(range, locale) !== chip.text)
    return { ...scope, financialRanges: ranges.length > 0 ? ranges : undefined }
  }
  if (chip.field === 'onrc' && scope.onrc && chip.part) {
    const kept = chip.part === 'exclude' ? { ...scope.onrc, exclude: undefined } : scope.onrc.exclude ? { exclude: scope.onrc.exclude } : {}
    const left = Object.values(kept).some((value) => value !== undefined)
    return { ...scope, onrc: left ? kept : undefined }
  }
  return { ...scope, [chip.field]: undefined }
}
