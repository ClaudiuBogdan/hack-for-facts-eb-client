import type { I18n } from '@lingui/core'
import { msg, plural, t } from '@lingui/core/macro'
import { ECHR_DEFAULT_QUESTION, type EchrQuestion } from './echr-address'
import { ECHR_FIRST_WHOLE_YEAR, ECHR_HUDOC_JUDGMENTS_BEFORE_WHOLE, figuresOf, yearEntry, yearState } from './echr-model'
import type { EchrSnapshot } from './echr-snapshot-types'
import { countText, dayText, monthText, rateText } from './judicial-format'
import { buildEchrPageTitle } from './justice-page-titles'

/** The ECHR page's words (design.md §17–18): years, columns, counts, the caveats and the browser tab's title. */

/** „iulie 2026": the month the capture stops in. */
export function lastMonthText(snapshot: EchrSnapshot): string {
  return monthText(snapshot.newest.slice(0, 7), 'long')
}

/** „2026 (până în iulie 2026)" for the year the capture stops in, „2009 (parțial)" for one before it went whole. */
export function yearText(snapshot: EchrSnapshot, year: number): string {
  switch (yearState(snapshot, year)) {
    case 'partial':
      return t`${year} (parțial)`
    case 'running':
      return t`${year} (până în ${lastMonthText(snapshot)})`
    case 'whole':
      return String(year)
  }
}

/** The years table's columns: what reached each of the Court's steps in a year. */
export const ECHR_FLOW_COLUMNS = ['communicated', 'decisions', 'judgments', 'applications'] as const
export type EchrFlowColumn = (typeof ECHR_FLOW_COLUMNS)[number]

/** A column's head: in full from `sm`, a word on a phone. */
export function flowLabel(column: EchrFlowColumn): { readonly full: string; readonly short: string } {
  switch (column) {
    case 'communicated':
      return { full: t`Comunicate Guvernului`, short: t`Comunic.` }
    case 'decisions':
      return { full: t`Decizii`, short: t`Decizii` }
    case 'judgments':
      return { full: t`Hotărâri`, short: t`Hotărâri` }
    case 'applications':
      return { full: t`Cereri soluționate prin hotărâri`, short: t`Cereri` }
  }
}

/** A median wait as a number: whole („6") or with its half („6,5"), never rounded away. */
export function medianWaitText(value: number): string {
  return Number.isInteger(value) ? countText(value) : rateText(value)
}

/** „6 ani", with the Romanian „de" from twenty up („21 de ani"). */
export function yearsCount(count: number): string {
  return plural(count, { one: '# an', few: '# ani', other: '# de ani' })
}

/** The applications a joined judgment decides beyond its first: „+1 cerere", „+12 cereri", „+27 de cereri". */
export function moreApplicationsText(count: number): string {
  return plural(count, { one: '+# cerere', few: '+# cereri', other: '+# de cereri' })
}

export function judgmentsCount(count: number): string {
  return plural(count, { one: '# hotărâre', few: '# hotărâri', other: '# de hotărâri' })
}

export function decisionsCount(count: number): string {
  return plural(count, { one: '# decizie', few: '# decizii', other: '# de decizii' })
}

export function joinedText(count: number): string {
  return plural(count, { one: '# hotărâre reunește mai multe cereri', few: '# hotărâri reunesc mai multe cereri', other: '# de hotărâri reunesc mai multe cereri' })
}

/** The other respondent states a judgment against Romania names; a code without a name here stays a code. */
export function countryName(code: string): string {
  switch (code) {
    case 'BGR':
      return t`Bulgaria`
    case 'ITA':
      return t`Italia`
    default:
      return code
  }
}

/** What a reader must know about the figures, behind the source line's marker; the running year's own note when it is the year asked. */
export function echrNotes(snapshot: EchrSnapshot, year: number): readonly string[] {
  const partial = ECHR_FIRST_WHOLE_YEAR - 1
  const held = yearEntry(snapshot, partial)?.judgments ?? 0
  const later = snapshot.judgments.filter((judgment) => judgment.followUp).length
  return [
    t`O hotărâre publicată în engleză și în franceză e numărată o dată (după ECLI); deciziile și cauzele comunicate, după dată și cereri.`,
    t`O cerere e numărată o dată, în anul primei ei hotărâri de aici. Hotărârile ulterioare, în cauze deja judecate (${judgmentsCount(later)}), sunt numărate ca hotărâri, nu și cererile lor, și nu intră în timpul de la cerere la hotărâre.`,
    t`Timpul de la cerere la hotărâre e calculat de Transparenta.eu din numărul cererii (anul depunerii) până la anul hotărârii; nu e o statistică a Curții.`,
    t`Cauzele comunicate sunt cererile trimise Guvernului pentru observații: cauze pe rol, nu hotărâri.`,
    t`Numele reclamanților nu sunt preluate aici; textul hotărârii e pe HUDOC, care o publică în engleză și franceză. Linkul deschide versiunea preluată.`,
    t`Hotărârile din ${ECHR_FIRST_WHOLE_YEAR} încoace sunt toate cele de pe HUDOC (verificat pe 7 octombrie 2026); ${partial} e preluat parțial (${held} din ${ECHR_HUDOC_JUDGMENTS_BEFORE_WHOLE}).`,
    ...(figuresOf(snapshot, year).state === 'running' ? [t`${year} e un an în curs: documente până la ${dayText(snapshot.newest)}.`] : []),
  ]
}

/** The headline: the question's year. */
export function echrHeadlineText(year: number): string {
  return t`Hotărârile CEDO în cauze cu România, în ${year}`
}

/** The browser tab: the page's own title for the bare page, the year's headline for another. */
export function echrDocumentTitle(i18n: I18n, question: EchrQuestion): string {
  if (question.year === ECHR_DEFAULT_QUESTION.year && question.view === ECHR_DEFAULT_QUESTION.view) return buildEchrPageTitle(i18n)
  return `${echrHeadlineText(question.year)} — ${i18n._(msg`Justiție`)} — Transparenta.eu`
}
