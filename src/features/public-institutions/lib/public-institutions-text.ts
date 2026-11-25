import { plural, t } from '@lingui/core/macro'
import { getClassificationName } from '@/lib/classifications'
import { getEconomicChapterName } from '@/lib/economic-classifications'
import type { AnalyticsFilterType } from '@/schemas/charts'

/**
 * The page's words, computed from the selection so they hold for any address:
 * the headline, its topic phrase, the chips of the filters the head does not
 * show, the ready questions. Functions only: `t` runs when called, in the
 * reader's language, never when the module loads.
 */

/** Whose money: every institution, the town halls (`is_uat`), or the town halls and county councils (the territorial executives). */
export type Who = 'all' | 'town-halls' | 'local-executives'

export function whoOf(filter: AnalyticsFilterType, perCapita: boolean): Who {
  if (filter.is_uat === true) return 'town-halls'
  // Per inhabitant the API ranks the territorial executives only, whatever the address says.
  if (perCapita || filter.is_territorial_executive === true) return 'local-executives'
  return 'all'
}

/** „Cheltuielile pe locuitor ale primăriilor și consiliilor județene”: what is measured, of whom. */
export function subjectOf({ income, perCapita, who }: { readonly income: boolean; readonly perCapita: boolean; readonly who: Who }): string {
  if (income) {
    if (perCapita) {
      if (who === 'town-halls') return t`Veniturile pe locuitor ale primăriilor`
      if (who === 'local-executives') return t`Veniturile pe locuitor ale primăriilor și consiliilor județene`
      return t`Veniturile pe locuitor ale instituțiilor publice`
    }
    if (who === 'town-halls') return t`Veniturile primăriilor`
    if (who === 'local-executives') return t`Veniturile primăriilor și consiliilor județene`
    return t`Veniturile instituțiilor publice`
  }
  if (perCapita) {
    if (who === 'town-halls') return t`Cheltuielile pe locuitor ale primăriilor`
    if (who === 'local-executives') return t`Cheltuielile pe locuitor ale primăriilor și consiliilor județene`
    return t`Cheltuielile pe locuitor ale instituțiilor publice`
  }
  if (who === 'town-halls') return t`Cheltuielile primăriilor`
  if (who === 'local-executives') return t`Cheltuielile primăriilor și consiliilor județene`
  return t`Cheltuielile instituțiilor publice`
}

export type Topic = { readonly key: 'functional_prefixes' | 'economic_prefixes'; readonly text: string }

/** A chapter's name as words in a sentence: „Învățământ” → „învățământ”, the code and any formula dropped. */
export function chapterWords(name: string): string {
  const words = name.replace(/^[\d.\s]+/, '').replace(/\s*\(.*\)\s*$/, '').trim()
  return words.charAt(0).toLocaleLowerCase('ro') + words.slice(1)
}

/** What the money is for, when the selection names exactly one chapter: the headline says it. */
export function topicOf(filter: AnalyticsFilterType): Topic | null {
  const functional = filter.functional_prefixes ?? []
  const economic = filter.economic_prefixes ?? []
  if (functional.length === 1 && economic.length === 0) {
    const name = getClassificationName(functional[0].replace(/\.$/, ''))
    return name ? { key: 'functional_prefixes', text: chapterWords(name) } : null
  }
  if (economic.length === 1 && functional.length === 0) {
    const name = getEconomicChapterName(economic[0].replace(/\.$/, ''))
    return name ? { key: 'economic_prefixes', text: chapterWords(name) } : null
  }
  return null
}

/** The headline in plain words: the bar's line, the headline's accessible name, its size. */
export function sentenceOf({ subject, topic, periodLabel }: { readonly subject: string; readonly topic: Topic | null; readonly periodLabel: string }): string {
  const about = topic ? ` ${t`pentru`} ${topic.text}` : ''
  const when = periodLabel ? `, ${t`în ${periodLabel}`}` : ''
  return `${subject}${about}${when}`
}

export type Chip = { readonly key: string; readonly text: string; readonly clear: Partial<AnalyticsFilterType> }

/** Keys the head or the headline already shows. */
const SHOWN = new Set(['account_category', 'report_period', 'normalization', 'report_type', 'currency', 'inflation_adjusted', 'exclude'])

function isSet(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** One chip per kind of filter the reader added beyond the head's choices and the headline's topic, each with its ✕. */
export function chipsOf(filter: AnalyticsFilterType, topic: Topic | null, perCapita: boolean): readonly Chip[] {
  const count = (value: unknown) => (Array.isArray(value) ? value.length : 1)
  const text = (key: string, n: number): string | null => {
    switch (key) {
      case 'entity_cuis':
        return plural(n, { one: 'o instituție aleasă', few: '# instituții alese', other: '# de instituții alese' })
      case 'main_creditor_cui':
        return t`un ordonator principal ales`
      case 'uat_ids':
        return plural(n, { one: 'o localitate', few: '# localități', other: '# de localități' })
      case 'county_codes':
        return plural(n, { one: 'un județ', few: '# județe', other: '# de județe' })
      case 'entity_types':
        return plural(n, { one: 'un tip de instituție', few: '# tipuri de instituții', other: '# de tipuri de instituții' })
      case 'tags':
        return plural(n, { one: 'o etichetă', few: '# etichete', other: '# de etichete' })
      case 'functional_codes':
        return plural(n, { one: 'un cod funcțional', few: '# coduri funcționale', other: '# de coduri funcționale' })
      case 'functional_prefixes':
        return plural(n, { one: 'un capitol funcțional', few: '# capitole funcționale', other: '# de capitole funcționale' })
      case 'economic_codes':
        return plural(n, { one: 'un cod economic', few: '# coduri economice', other: '# de coduri economice' })
      case 'economic_prefixes':
        return plural(n, { one: 'un titlu economic', few: '# titluri economice', other: '# de titluri economice' })
      case 'budget_sector_ids':
        return plural(n, { one: 'un sector bugetar', few: '# sectoare bugetare', other: '# de sectoare bugetare' })
      case 'funding_source_ids':
        return plural(n, { one: 'o sursă de finanțare', few: '# surse de finanțare', other: '# de surse de finanțare' })
      case 'is_uat':
        return filter.is_uat ? t`doar primăriile` : t`fără primării`
      case 'is_territorial_executive':
        return filter.is_territorial_executive ? t`doar primăriile și consiliile județene` : t`fără primării și consilii județene`
      case 'aggregate_min_amount':
        return t`o sumă minimă`
      case 'aggregate_max_amount':
        return t`o sumă maximă`
      case 'min_population':
        return t`o populație minimă`
      case 'max_population':
        return t`o populație maximă`
      default:
        return null
    }
  }
  const chips: Chip[] = []
  for (const [key, value] of Object.entries(filter)) {
    if (SHOWN.has(key) || key === topic?.key || !isSet(value)) continue
    // Per inhabitant the territorial executives are the scope whatever the address says: the headline says it.
    if (key === 'is_territorial_executive' && perCapita) continue
    const words = text(key, count(value))
    if (words) chips.push({ key, text: words, clear: { [key]: undefined } as Partial<AnalyticsFilterType> })
  }
  const excluded = Object.values(filter.exclude ?? {}).filter(isSet).length
  if (excluded > 0) chips.push({ key: 'exclude', text: plural(excluded, { one: 'o excludere', few: '# excluderi', other: '# de excluderi' }), clear: { exclude: undefined } })
  return chips
}

export type Question = { readonly group: string; readonly text: string; readonly filter: Partial<AnalyticsFilterType> }

/** Ready questions: each a whole selection, asked about the year and the reports the page is on. */
export function readyQuestions(): readonly Question[] {
  const who = t`Cine`
  const perPerson = t`Pe locuitor`
  const what = t`Pe ce`
  return [
    { group: who, text: t`Instituțiile cu cele mai mari cheltuieli`, filter: {} },
    { group: who, text: t`Instituțiile cu cele mai mari venituri`, filter: { account_category: 'vn' } },
    { group: who, text: t`Primăriile și consiliile județene, după cheltuieli`, filter: { is_territorial_executive: true } },
    { group: perPerson, text: t`Unde se cheltuie cel mai mult pe locuitor`, filter: { normalization: 'per_capita' } },
    { group: perPerson, text: t`Unde sunt cele mai mari venituri pe locuitor`, filter: { account_category: 'vn', normalization: 'per_capita' } },
    { group: what, text: t`Cine cheltuie cel mai mult pe învățământ`, filter: { functional_prefixes: ['65'] } },
    { group: what, text: t`Cine cheltuie cel mai mult pe sănătate`, filter: { functional_prefixes: ['66'] } },
    { group: what, text: t`Cine cheltuie cel mai mult pe asistență socială`, filter: { functional_prefixes: ['68'] } },
    { group: what, text: t`Cine cheltuie cel mai mult pe transporturi`, filter: { functional_prefixes: ['84'] } },
    { group: what, text: t`Cele mai mari cheltuieli de personal`, filter: { economic_prefixes: ['10'] } },
  ]
}

/** „date pentru tot anul 2025”, „date până în octombrie 2026”: how far the selected year's reports reach. */
export function coverageText(coverage: { readonly year: number; readonly complete: boolean; readonly lastMonth: string | null }, locale: string): string {
  if (coverage.complete) return t`date pentru tot anul ${coverage.year}`
  if (!coverage.lastMonth) return t`anul ${coverage.year} e în curs`
  const [year, month] = coverage.lastMonth.split('-').map(Number)
  const monthName = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))
  return t`date până în ${monthName} ${year}`
}
