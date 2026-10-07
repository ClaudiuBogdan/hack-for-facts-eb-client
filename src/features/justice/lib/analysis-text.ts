import type { I18n } from '@lingui/core'
import { msg, plural, t } from '@lingui/core/macro'
import { countyNameRo } from '@/lib/territory-counties'
import { COURTS, filterCount, MATTER_CODES, NO_COUNTY, OTHER_STAGES, type AnalysisSource, type Grouping, type LevelKey, type MatterKey, type Question } from './analysis-model'
import { lastMonthText } from './analysis-notes'
import { JUSTICE_LAST_CAPTURE_YEAR } from './hub-years'
import { caseCategoryLabel, courtLevelLabel, courtName, stageLabel } from './judicial-labels'
import type { StageKey } from './judicial-model'
import { buildAnalysisPageTitle } from './justice-page-titles'

/** The analysis page's words: the groups' and filters' names, the question as one sentence, the page's titles. */

/** A year as the year menu names it: the capture's last one with the month the question's source stops in. */
export function yearText(year: number, source: AnalysisSource): string {
  return year === JUSTICE_LAST_CAPTURE_YEAR ? t`${year} (până în ${lastMonthText(source)})` : String(year)
}

export function groupingLabel(grouping: Grouping): string {
  switch (grouping) {
    case 'instante':
      return t`Instanțe`
    case 'judete':
      return t`Județe`
    case 'materii':
      return t`Materii`
    case 'etape':
      return t`Etape`
    case 'niveluri':
      return t`Niveluri`
  }
}

export function levelLabel(level: LevelKey): string {
  switch (level) {
    case 'judecatorie':
      return t`Judecătorii`
    case 'tribunal':
      return t`Tribunale`
    case 'curte_de_apel':
      return t`Curți de apel`
    case 'inalta_curte':
      return t`Înalta Curte`
    case 'militare':
      return t`Instanțe militare`
  }
}

export function matterLabel(matter: MatterKey): string {
  return caseCategoryLabel(MATTER_CODES[matter][0]) ?? matter
}

export function countyLabel(code: string): string {
  if (code === NO_COUNTY) return t`Înalta Curte (toată țara)`
  if (code === 'B') return t`București`
  return countyNameRo(code) ?? code
}

export function stageName(stage: StageKey | typeof OTHER_STAGES): string {
  return stageLabel(stage === OTHER_STAGES ? 'other' : stage)
}

/** A row's name under a grouping, and the quiet line under it (a court's level and county). */
export function rowLabel(grouping: Grouping, key: string): { readonly label: string; readonly sub: string | null } {
  if (key === 'restul') return { label: t`Restul`, sub: null }
  switch (grouping) {
    case 'instante': {
      const court = COURTS.get(key)
      return { label: courtName(key), sub: [court ? courtLevelLabel(court.apiLevel) : null, court?.county ? countyLabel(court.county) : null].filter(Boolean).join(' · ') || null }
    }
    case 'judete':
      return { label: countyLabel(key), sub: null }
    case 'materii':
      return { label: key in MATTER_CODES ? matterLabel(key as MatterKey) : (caseCategoryLabel(key) ?? key), sub: null }
    case 'etape':
      return { label: stageName(key as StageKey | typeof OTHER_STAGES), sub: null }
    case 'niveluri':
      return { label: levelLabel(key as LevelKey), sub: null }
  }
}

// ─────────────────────────────────────────────────────────── headline ──

export type PhraseRole = 'base' | 'matters' | 'stages' | 'levels' | 'counties' | 'courts' | 'dupa'

export interface Phrase {
  readonly role: PhraseRole
  /** What goes before the phrase: a space, a comma. */
  readonly before: string
  readonly text: string
}

function matterPhrase(matter: MatterKey): string {
  switch (matter) {
    case 'civil':
      return t`civile`
    case 'penal':
      return t`penale`
    case 'litigiicuprofesionistii':
      return t`de litigii cu profesioniștii`
    case 'contenciosadministrativsifiscal':
      return t`de contencios administrativ și fiscal`
    case 'minorisifamilie':
      return t`de minori și familie`
    case 'asigurarisociale':
      return t`de asigurări sociale`
    case 'litigiidemunca':
      return t`de litigii de muncă`
    case 'faliment':
      return t`de faliment`
    case 'proprietateintelectuala':
      return t`de proprietate intelectuală`
    case 'insolventapersoaneifizice':
      return t`de insolvență a persoanei fizice`
    case 'dreptmaritimsifluvial':
      return t`de drept maritim și fluvial`
    case 'altematerii':
      return t`din alte materii`
  }
}

function stagePhrase(stage: StageKey): string {
  switch (stage) {
    case 'fond':
      return t`în fond`
    case 'apel':
      return t`în apel`
    case 'recurs':
      return t`în recurs`
    case 'contestatie':
      return t`în contestație`
    case 'extraordinare':
      return t`în revizuire sau contestație în anulare`
  }
}

/** Where a level is said: „la tribunale", or „la tribunalele" before the county that places them. */
function levelPhrase(level: LevelKey, placed: boolean): string {
  switch (level) {
    case 'judecatorie':
      return placed ? t`la judecătoriile` : t`la judecătorii`
    case 'tribunal':
      return placed ? t`la tribunalele` : t`la tribunale`
    case 'curte_de_apel':
      return t`la curțile de apel`
    case 'inalta_curte':
      return t`la Înalta Curte`
    case 'militare':
      return t`la instanțele militare`
  }
}

function groupingPhrase(grouping: Grouping): string {
  switch (grouping) {
    case 'instante':
      return t`pe instanțe`
    case 'judete':
      return t`pe județe`
    case 'materii':
      return t`pe materii`
    case 'etape':
      return t`pe etape`
    case 'niveluri':
      return t`pe niveluri de instanță`
  }
}

function joined(items: readonly string[]): string {
  return items.length === 2 ? t`${items[0]} și ${items[1]}` : (items[0] ?? '')
}

/**
 * The question as one sentence, phrase by phrase, each phrase a filter the
 * reader can open or drop: „Dosarele de faliment la tribunalele din județul
 * Cluj, pe instanțe". The year is the period menu's, as the other analysis
 * pages keep theirs; a court picked says the place, its county and level
 * then stay as chips (`unsaidChips`).
 */
export function headlineOf(question: Question): readonly Phrase[] {
  const phrases: Phrase[] = [{ role: 'base', before: '', text: t`Dosarele` }]
  const { matters, stages, levels, counties, courts } = question
  if (matters.length > 0) phrases.push({ role: 'matters', before: ' ', text: matters.length <= 2 ? joined(matters.map(matterPhrase)) : plural(matters.length, { other: 'din # materii' }) })
  if (stages.length > 0) phrases.push({ role: 'stages', before: ' ', text: stages.length <= 2 ? joined(stages.map(stagePhrase)) : plural(stages.length, { other: 'în # etape' }) })
  if (courts.length > 0) {
    phrases.push({ role: 'courts', before: ' ', text: courts.length === 1 ? t`la ${courtName(courts[0]!)}` : plural(courts.length, { few: 'la # instanțe', other: 'la # de instanțe' }) })
  } else {
    if (levels.length > 0) phrases.push({ role: 'levels', before: ' ', text: levels.length === 1 ? levelPhrase(levels[0]!, counties.length > 0) : plural(levels.length, { other: 'la # niveluri de instanță' }) })
    if (counties.length > 0) {
      const county = counties[0]!
      // A place the question's cases are judged in: its own message, which a language may say otherwise than a provenance.
      const one = county === 'B' ? t({ message: 'din București', context: 'the place a question asks about' }) : t`din județul ${countyLabel(county)}`
      phrases.push({ role: 'counties', before: ' ', text: counties.length === 1 ? one : plural(counties.length, { few: 'din # județe', other: 'din # de județe' }) })
    }
  }
  phrases.push({ role: 'dupa', before: ', ', text: groupingPhrase(question.dupa) })
  return phrases
}

export function headlineText(question: Question): string {
  return headlineOf(question)
    .map((phrase) => phrase.before + phrase.text)
    .join('')
}

/** The filters the sentence does not say (a court's county and level), as chips. */
export function unsaidChips(question: Question): readonly { readonly role: 'levels' | 'counties'; readonly key: string; readonly label: string }[] {
  if (question.courts.length === 0) return []
  return [
    ...question.levels.map((level) => ({ role: 'levels' as const, key: level, label: levelLabel(level) })),
    ...question.counties.map((county) => ({ role: 'counties' as const, key: county, label: countyLabel(county) })),
  ]
}

// ───────────────────────────────────────────────────────────── titles ──

/** The browser tab's title for a question: the bare page by the page's title (the route head's), any other by its headline. */
export function analysisDocumentTitle(i18n: I18n, question: Question): string {
  if (filterCount(question) === 0 && question.dupa === 'instante') return buildAnalysisPageTitle(i18n)
  return `${headlineText(question)} — ${i18n._(msg`Justiție`)} — Transparenta.eu`
}
