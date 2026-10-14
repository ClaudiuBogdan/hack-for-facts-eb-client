import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { placeKey, searchPlaces, type PlaceIndex } from '@/features/procurement/lib/analytics-places'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type { CompanyAnalysisFlagValue, CompanyAnalysisRelease, CompanyAnalysisScope, CompanyAnalysisSizeBand } from '@/schemas/company-analytics'
import { ANALYSIS_LEGAL_FORMS } from './company-analytics-url'
import { amongFilers, keyToggled, withFiling } from './company-analytics-filter-model'
import { countyLabel, sizeBandLabel } from './company-analytics-text'
import { legalFormName } from './company-legal-forms'
import { statusGroupOf, statusGroups } from './company-analytics-states'

/**
 * „Adaugă un filtru"'s answers to what a reader types: a CUI as typed, the
 * counties, the localities, the legal forms, the states, the sizes, the
 * fiscal flags, the filing and — from the name search — companies. Each is
 * the selection with that filter added, so a pick is one move.
 */

export type SuggestionGroup = 'cui' | 'county' | 'uat' | 'form' | 'status' | 'size' | 'fiscal' | 'filing' | 'company'

export interface Suggestion {
  readonly key: string
  readonly group: SuggestionGroup
  readonly label: string
  /** Quieter words after the label: a locality's county, a form's name, a company's CUI. */
  readonly hint?: string
  readonly scope: CompanyAnalysisScope
}

export interface SuggestionInput {
  readonly term: string
  readonly scope: CompanyAnalysisScope
  readonly year: number | null
  /** The localities, once their files are read. */
  readonly places: PlaceIndex | null
  /** The name search's hits. */
  readonly companies: readonly { readonly cui: string; readonly label: string }[]
  /** How many values a field may hold; none is offered past its limit, nor before it is known. */
  readonly limits: Pick<CompanyAnalysisRelease['limits'], 'maxSelectedCuis' | 'maxCounties' | 'maxUats' | 'maxLegalForms'> | null
}

const SIZES: readonly CompanyAnalysisSizeBand[] = ['ZERO', 'FROM_1_TO_9', 'FROM_10_TO_49', 'FROM_50_TO_249', 'FROM_250']

const CUI_TYPED = /^(?:ro)?\s*([1-9]\d{1,9})$/iu

/** Typed text as it is compared: no diacritics, lower case, any dash a hyphen („10–49" is „10-49"). */
function fold(text: string): string {
  return placeKey(text).replace(/[–—]/gu, '-')
}

/** Whether a word of the text starts with the typed key („ti" finds „Timiș", not „Societate"); a key of several words at any word. */
function atWordStart(text: string, key: string): boolean {
  const folded = fold(text)
  for (let at = folded.indexOf(key); at >= 0; at = folded.indexOf(key, at + 1)) {
    if (at === 0 || !/[\p{L}\p{N}]/u.test(folded.charAt(at - 1))) return true
  }
  return false
}

function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1)
}

function only<T>(values: readonly T[] | undefined, value: T): boolean {
  return values?.length === 1 && values[0] === value
}

export function suggestionsOf({ term, scope, year, places, companies, limits }: SuggestionInput): readonly Suggestion[] {
  const typed = term.trim()
  const key = fold(typed)
  if (key.length < 2) return []
  const found: Suggestion[] = []
  // A field's limit unknown (the release still being read): nothing is added to it.
  const room = (values: readonly unknown[] | undefined, max: number | undefined) => max !== undefined && (values?.length ?? 0) < max
  const cuis = scope.cuis ?? []
  const roomForCompanies = room(cuis, limits?.maxSelectedCuis)

  const cui = CUI_TYPED.exec(typed)?.[1] ?? null
  if (cui && roomForCompanies && !cuis.includes(cui)) found.push({ key: `cui-${cui}`, group: 'cui', label: t`CUI ${cui}`, scope: { ...scope, cuis: [...cuis, cui] } })

  const counties = scope.county?.in ?? []
  const namedCounties = room(counties, limits?.maxCounties)
    ? ROMANIA_COUNTIES.filter((county) => !counties.includes(county.code) && (county.code.toLowerCase() === key || atWordStart(county.nameRo, key)))
    : []
  namedCounties.slice(0, 4).forEach((county) => found.push({ key: `county-${county.code}`, group: 'county', label: county.nameRo, scope: { ...scope, county: keyToggled(scope.county, county.code) } }))

  const uats = scope.uat?.in ?? []
  if (places && room(uats, limits?.maxUats)) {
    // Within the one county picked, as the panel's locality field looks.
    const within = counties.length === 1 ? (counties[0] ?? null) : null
    searchPlaces(places, typed, { region: null, county: within }, 6)
      .localities.filter((place) => !uats.includes(place.value))
      .slice(0, 5)
      .forEach((place) =>
        found.push({ key: `uat-${place.value}`, group: 'uat', label: place.name, hint: place.county ? countyLabel(place.county) : undefined, scope: { ...scope, uat: keyToggled(scope.uat, place.value) } }),
      )
  }

  const forms = scope.legalForms ?? []
  for (const form of room(forms, limits?.maxLegalForms) ? ANALYSIS_LEGAL_FORMS : []) {
    const name = legalFormName(form, (descriptor) => i18n._(descriptor)) ?? form
    if (!forms.includes(form) && (form.toLowerCase().startsWith(key) || atWordStart(name, key))) found.push({ key: `form-${form}`, group: 'form', label: form, hint: name, scope: { ...scope, legalForms: [...forms, form] } })
  }

  const current = statusGroupOf(scope)
  for (const group of statusGroups()) {
    if (group.phrase !== current?.phrase && atWordStart(group.phrase, key)) found.push({ key: `status-${group.phrase}`, group: 'status', label: capitalized(group.phrase), scope: { ...scope, observedStatus: group.scope } })
  }

  const sizes = scope.employeeSizeBands ?? []
  for (const band of SIZES) {
    const label = sizeBandLabel(band)
    if (!sizes.includes(band) && atWordStart(label, key)) found.push({ key: `size-${band}`, group: 'size', label, scope: { ...amongFilers(scope), employeeSizeBands: [...sizes, band] } })
  }

  const flags: readonly { readonly field: 'vatPayer' | 'fiscallyInactive'; readonly value: CompanyAnalysisFlagValue; readonly label: string }[] = [
    { field: 'vatPayer', value: 'YES', label: t`Plătitoare de TVA` },
    { field: 'vatPayer', value: 'NO', label: t`Neplătitoare de TVA` },
    { field: 'fiscallyInactive', value: 'YES', label: t`Inactive fiscal` },
    { field: 'fiscallyInactive', value: 'NO', label: t`Active fiscal` },
  ]
  for (const flag of flags) {
    if (!only(scope[flag.field], flag.value) && atWordStart(flag.label, key)) found.push({ key: `${flag.field}-${flag.value}`, group: 'fiscal', label: flag.label, scope: { ...scope, [flag.field]: [flag.value] } })
  }

  if (year !== null) {
    const filings = [
      { filing: 'FILED' as const, label: t`Cu bilanț pe ${year}` },
      { filing: 'NOT_FILED' as const, label: t`Fără bilanț pe ${year}` },
    ]
    for (const item of filings) {
      if (scope.filing !== item.filing && atWordStart(item.label, key)) found.push({ key: `filing-${item.filing}`, group: 'filing', label: item.label, scope: withFiling(scope, item.filing) })
    }
  }

  if (roomForCompanies) {
    companies
      .filter((hit) => hit.cui !== cui && !cuis.includes(hit.cui))
      .slice(0, 5)
      .forEach((hit) => found.push({ key: `company-${hit.cui}`, group: 'company', label: hit.label, hint: t`CUI ${hit.cui}`, scope: { ...scope, cuis: [...cuis, hit.cui] } }))
  }
  return found
}
