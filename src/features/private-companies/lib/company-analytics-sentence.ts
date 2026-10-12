import { t } from '@lingui/core/macro'
import type { CompanyAnalysisOnrcBasis, CompanyAnalysisRelease, CompanyAnalysisSizeBand } from '@/schemas/company-analytics'
import { COMPANY_ANALYSIS_SIZE_BANDS } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../api/company-analytics-plan'
import { scopeChips, type ScopeChip, type ScopeField, type ScopeNames } from './company-analytics-scope-text'
import { statusGroupOf } from './company-analytics-states'
import { consensusKeysOf, countyLabel, flagLabel, onrcBasisPhrase } from './company-analytics-text'
import type { CompanyAnalyticsState } from './company-analytics-url'

/**
 * The analysis page's selection in words — „Firmele SRL radiate din județul
 * Cluj, plătitoare de TVA, în 2024" — for the headline (each filter a phrase
 * with its ✕), the pinned bar and the document's title. A lead phrase joins
 * the subject; the rest follow commas.
 */

/** What the sentence is written from: the question, the names it needs, the localities' counties. */
export interface SentenceSource {
  readonly state: CompanyAnalyticsState
  readonly names: ScopeNames
  readonly locale: 'ro' | 'en'
  readonly question: ResolvedQuestion | null
  readonly live: CompanyAnalysisRelease | undefined
  readonly uats: { readonly localities: readonly { readonly value: string; readonly county: string | null }[] | null }
}

/** One filter of the selection as words inside the headline; a lead phrase joins the subject („Firmele SRL radiate din Cluj"), the rest follow commas. */
export interface Phrase {
  readonly field: ScopeField
  /** The filter it says, as the panel's chip: what its ✕ removes (one range, one part of the ONRC observations). */
  readonly chip: ScopeChip
  readonly text: string
  readonly lead: boolean
  /** What comes before it: a space after the subject, a comma otherwise (and for the county after its locality). */
  readonly before: string
}

function joined(values: readonly string[]): string {
  return values.length <= 3 ? values.join(', ') : t`${values.slice(0, 3).join(', ')} și încă ${values.length - 3}`
}

/** Values a filter takes any of: „a, b sau c". */
function alternatives(values: readonly string[]): string {
  return values.length <= 1 ? (values[0] ?? '') : t`${values.slice(0, -1).join(', ')} sau ${values[values.length - 1]}`
}

/** Any of many, the first three named: „SRL, SA sau SNC", „SRL, SA, SNC sau încă 2" (a list with „și" would read as all of them). */
function anyOf(values: readonly string[]): string {
  return values.length <= 3 ? alternatives(values) : t`${values.slice(0, 3).join(', ')} sau încă ${values.length - 3}`
}

/** „1–9", never parted at its dash: a line may break after an en dash, and „1–" / „9" reads as two things. */
function range(from: number, to: number): string {
  return `${from}\u2060–\u2060${to}`
}

/** A size band in the headline, by its numbers only. */
const SIZE_SHORT: Partial<Record<CompanyAnalysisSizeBand, string>> = { ZERO: '0', FROM_1_TO_9: range(1, 9), FROM_10_TO_49: range(10, 49), FROM_50_TO_249: range(50, 249), FROM_250: '250+' }

/** The headline's order: the form, then the state, then the place (a locality before its county); the rest after commas. */
const LEAD_ORDER: readonly ScopeField[] = ['legalForms', 'observedStatus', 'uat', 'county']

/** „din Cluj": a place — its own message, apart from the date's „din 2019" („since 2019") the catalog holds. */
function inPlace(place: string): string {
  return t({ message: `din ${place}`, context: 'place' })
}

/** The counties by what they are: „județul Sibiu", „județele Cluj, Timiș", București by its name and first (it is no county). */
function countyWords(codes: readonly string[]): string {
  const counties = codes.filter((code) => code !== 'B').map(countyLabel)
  const named = counties.length === 0 ? null : counties.length === 1 ? t`județul ${counties[0]}` : t`județele ${joined(counties)}`
  if (!codes.includes('B')) return named ?? ''
  return named ? t`București și ${named}` : t`București`
}

/**
 * A consensus filter's companies without a common value: for any reason
 * („fără un județ comun"), or for the reasons asked for („fără un județ
 * comun (valori diferite în înscrieri)"); null when none are asked for.
 */
function withoutCommon(field: 'county' | 'uat' | 'observedStatus', bases: readonly CompanyAnalysisOnrcBasis[], any: boolean): string | null {
  if (!any && bases.length === 0) return null
  const reasons = alternatives(bases.map(onrcBasisPhrase))
  if (field === 'county') return any ? t`fără un județ comun` : t`fără un județ comun (${reasons})`
  if (field === 'uat') return any ? t`fără o localitate comună` : t`fără o localitate comună (${reasons})`
  return any ? t`fără stare comună` : t`fără stare comună (${reasons})`
}

/** The selection in phrases a sentence can hold („din Cluj", „SRL", „plătitoare de TVA"); anything else in the chip's own words. */
export function phrasesOf(page: SentenceSource): readonly Phrase[] {
  const { state, names, locale, question } = page
  const scope = state.scope
  const year = question?.year
  const phrases = scopeChips(scope, locale, names).map((chip): Phrase => {
    const rest = (text: string): Phrase => ({ field: chip.field, chip, text, lead: false, before: ', ' })
    const lead = (text: string, before = ' '): Phrase => ({ field: chip.field, chip, text, lead: true, before })
    switch (chip.field) {
      case 'county': {
        // The companies with no common county, when they are asked for too, are said: they are in the figures.
        const { values: codes, bases } = consensusKeysOf(scope.county?.in ?? [])
        const none = withoutCommon('county', bases, Boolean(scope.county?.includeUnknown))
        if (codes.length === 0) return rest(none ?? chip.text)
        const place = none ? t`din ${countyWords(codes)} sau ${none}` : inPlace(countyWords(codes))
        const uats = consensusKeysOf(scope.uat?.in ?? [])
        if (uats.values.length === 0) return lead(place)
        // After its localities, the county says which („din Sibiu, județul Sibiu") — only once the localities'
        // files show every one of them in it; two places that may not hold together are two conditions.
        const countyOf = new Map((page.uats.localities ?? []).map((item) => [item.value, item.county]))
        const within = codes.length === 1 && !none && !scope.uat?.includeUnknown && uats.bases.length === 0 && uats.values.every((code) => countyOf.get(code) === codes[0])
        return within ? lead(countyWords(codes), ', ') : lead(place, ', ')
      }
      case 'uat': {
        const { values, bases } = consensusKeysOf(scope.uat?.in ?? [])
        const uats = values.map((code) => names.uats?.get(code) ?? code)
        const none = withoutCommon('uat', bases, Boolean(scope.uat?.includeUnknown))
        if (uats.length === 0) return rest(none ?? chip.text)
        return lead(none ? t`din ${joined(uats)} sau ${none}` : inPlace(joined(uats)))
      }
      case 'legalForms':
        return lead(anyOf(scope.legalForms ?? []))
      case 'observedStatus': {
        const group = statusGroupOf(scope)
        if (group) return lead(group.phrase)
        // „cu starea „faliment"", several as alternatives („… sau …"): a status is a value, not a word of the sentence.
        const { values, bases } = consensusKeysOf(scope.observedStatus?.in ?? [])
        const statuses = values.map((code) => `„${(names.statuses?.get(code) ?? code).toLocaleLowerCase('ro-RO')}”`)
        const none = withoutCommon('observedStatus', bases, Boolean(scope.observedStatus?.includeUnknown))
        if (statuses.length === 0) return rest(none ?? chip.text)
        return rest(t`cu starea ${alternatives([...statuses, ...(none ? [none] : [])])}`)
      }
      case 'vatPayer': {
        const values = scope.vatPayer ?? []
        return rest(values.length === 1 && values[0] === 'YES' ? t`plătitoare de TVA` : values.length === 1 && values[0] === 'NO' ? t`neplătitoare de TVA` : t`TVA: ${joined(values.map(flagLabel))}`)
      }
      case 'fiscallyInactive': {
        const values = scope.fiscallyInactive ?? []
        return rest(values.length === 1 && values[0] === 'YES' ? t`inactive fiscal` : values.length === 1 && values[0] === 'NO' ? t`active fiscal` : chip.text)
      }
      case 'filing':
        return rest(scope.filing === 'FILED' ? t`cu bilanț pe ${year ?? ''}` : t`fără bilanț pe ${year ?? ''}`)
      case 'employeeSizeBands': {
        // The bands by size under one „salariați" („cu 10–49 sau 250+ salariați"); the two a statement could not place read as what they are.
        const bands = COMPANY_ANALYSIS_SIZE_BANDS.filter((band) => scope.employeeSizeBands?.includes(band))
        const counted = bands.flatMap((band) => (SIZE_SHORT[band] ? [SIZE_SHORT[band]] : []))
        const parts = [
          ...(counted.length > 0 ? [t`cu ${alternatives(counted)} salariați`] : []),
          ...(bands.includes('UNAVAILABLE') ? [t`fără număr de salariați raportat`] : []),
          ...(bands.includes('NEGATIVE') ? [t`cu număr negativ de salariați`] : []),
        ]
        return rest(alternatives(parts))
      }
      case 'cuis': {
        // „cu CUI 36804600", several as alternatives: the code keeps its capitals.
        const cuis = scope.cuis ?? []
        return rest(t`cu CUI ${cuis.length <= 3 ? alternatives(cuis) : joined(cuis)}`)
      }
      default:
        // Lower case to join the sentence, an acronym („TVA", „CAEN") left as it is.
        return rest(/^\p{Lu}\p{Lu}/u.test(chip.text) ? chip.text : chip.text.charAt(0).toLocaleLowerCase('ro-RO') + chip.text.slice(1))
    }
  })
  const leads = LEAD_ORDER.flatMap((field) => phrases.filter((phrase) => phrase.lead && phrase.field === field))
  return [...leads, ...phrases.filter((phrase) => !phrase.lead)]
}

/** The selection in plain words: the headline's, and the pinned bar's when the head is gone. */
export function sentenceOf(page: SentenceSource): string {
  const year = page.question?.year ?? page.live?.defaults.fiscalYear ?? null
  return t`Firmele` + phrasesOf(page).map((phrase) => phrase.before + phrase.text).join('') + (year ? `, ${t`în ${year}`}` : '')
}

