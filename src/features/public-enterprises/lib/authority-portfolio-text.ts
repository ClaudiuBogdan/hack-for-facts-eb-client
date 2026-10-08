import { plural, t } from '@lingui/core/macro'

import { divisionLabel } from '@/features/private-companies/lib/caen-divisions'
import type { PublicEnterprisePortfolioSort } from '@/schemas/public-enterprises'
import type { AuthorityPortfolio, PortfolioAuthority } from '@/schemas/public-enterprise-portfolio'
import {
  AMEPIP_BLANK,
  AMEPIP_FUNCTIONING,
  AMEPIP_NONE,
  AMEPIP_UNREAD,
  disagreements,
  downLanes,
  type Disagreement,
  type FigureMeasure,
  type Flag,
  type HeldReason,
  type ListTallyKey,
  type MissingFigure,
  type PortfolioRow,
  type RegistryState,
} from './authority-portfolio-model'
import { displayName, enterpriseCount, formatCount, formatDate, formatLei, s1001ListDate } from './hub-format'
import { sourceStatusLabel } from './hub-text'

/**
 * The authority portfolio's words. The authority is the sentence's subject
 * and every count is said with the source that gives it; a control edge is
 * the source's word, never ownership.
 */

/** The authority as ANAF's list spells it (else the announcements, else its budget record), or its CUI said as a CUI. */
export function authorityTitle(authority: PortfolioAuthority): string {
  const cui = authority.cui
  return authority.name ? displayName(authority.name) : t`Autoritatea cu CUI ${cui}`
}

/** Where the name came from, when it is not ANAF's list. */
export function nameSourceNote(authority: PortfolioAuthority): string | null {
  if (!authority.name) return null
  if (authority.nameSource === 'json_apt') return t`numele, cum îl scriu anunțurile de selecție AMEPIP`
  if (authority.nameSource === 'budget') return t`numele, cum îl scrie fișa ei din buget`
  return null
}

/** The kicker after the front door: the county for a local authority, „central" for the state's; nothing when the list gives no level. */
export function kickerText(authority: PortfolioAuthority): string | null {
  if (authority.level === 'central') return t`Autoritate centrală`
  if (authority.level === 'local') return authority.county ? displayName(authority.county) : t`Autoritate locală`
  return null
}

/**
 * The head's sentence: what ANAF's list gives the authority, then what the
 * selection announcements add or say otherwise. Counts only, each with its
 * source; a lane that was down when the snapshot was read is said down,
 * never read as „none".
 */
export function headSentence(portfolio: AuthorityPortfolio, rows: readonly PortfolioRow[], locale: string): string {
  const down = downLanes(portfolio)
  const inList = rows.filter((row) => row.inList).length
  const both = rows.filter((row) => row.inList && row.inAnnouncements).length
  const extra = rows.filter((row) => !row.inList).length
  const parts = disagreements(portfolio.authority.cui, rows, down)
  const elsewhere = parts.filter((part) => part.kind === 'announcements-elsewhere').length
  const listElsewhere = parts.filter((part) => part.kind === 'list-elsewhere').length
  if (inList === 0) {
    const lead = t`După anunțurile de selecție AMEPIP, controlează ${enterpriseCount(extra, locale)}`
    if (down.list) return `${lead}; ${t`lista ANAF a întreprinderilor publice nu era încărcată la citire.`}`
    if (extra > 0 && listElsewhere === extra) {
      return `${lead}; ${plural(extra, { one: 'lista ANAF a întreprinderilor publice o pune sub altă autoritate.', other: 'lista ANAF a întreprinderilor publice le pune sub alte autorități.' })}`
    }
    return `${lead}; ${plural(extra, { one: 'lista ANAF a întreprinderilor publice nu o pune sub ea.', other: 'lista ANAF a întreprinderilor publice nu pune niciuna sub ea.' })}`
  }
  const sentences = [t`După lista ANAF a întreprinderilor publice, controlează ${enterpriseCount(inList, locale)}.`]
  // What the announcements say of the list's enterprises agrees with how many there are: „pentru ea", „pentru toate", „pentru # dintre ele".
  let named: string | null = null
  if (both > 0 && both === inList) named = inList === 1 ? t`Anunțurile de selecție AMEPIP o numesc și ele pentru ea` : t`Anunțurile de selecție AMEPIP o numesc pentru toate`
  else if (both > 0) named = plural(both, { one: 'Anunțurile de selecție AMEPIP o numesc pentru una dintre ele', other: 'Anunțurile de selecție AMEPIP o numesc pentru # dintre ele' })
  if (named && extra > 0) {
    sentences.push(`${named} ${plural(extra, { one: 'și pentru încă una, pe care lista nu o pune sub ea.', other: 'și pentru încă #, pe care lista nu le pune sub ea.' })}`)
  } else if (named) {
    sentences.push(`${named}.`)
  } else if (extra > 0) {
    const n = formatCount(extra, locale)
    sentences.push(
      plural(extra, {
        one: 'Anunțurile de selecție AMEPIP o mai numesc pentru o întreprindere, pe care lista nu o pune sub ea.',
        few: `Anunțurile de selecție AMEPIP o mai numesc pentru ${n} întreprinderi, pe care lista nu le pune sub ea.`,
        other: `Anunțurile de selecție AMEPIP o mai numesc pentru ${n} de întreprinderi, pe care lista nu le pune sub ea.`,
      }),
    )
  } else if (down.announcements) {
    sentences.push(t`Anunțurile de selecție AMEPIP nu erau încărcate la citire.`)
  }
  // „Cele din listă", never a bare „ea" or „toate": a sentence on the announcements' own enterprises may stand between.
  if (elsewhere > 0 && elsewhere === inList) {
    sentences.push(inList === 1 ? t`Pentru cea din listă, anunțurile numesc altă autoritate.` : t`Pentru fiecare dintre cele din listă, anunțurile numesc altă autoritate.`)
  } else if (elsewhere > 0) {
    sentences.push(plural(elsewhere, { one: 'Pentru una dintre cele din listă, anunțurile numesc altă autoritate.', other: 'Pentru # dintre cele din listă, anunțurile numesc altă autoritate.' }))
  }
  return sentences.join(' ')
}

// ──────────────────────────────────────────────────────────── status ──

/** The panel's parts for ANAF's list: the list's word for its own enterprises, then where it has the others. */
export function listTallyLabel(key: ListTallyKey): string {
  switch (key) {
    case 'active':
      return t`Activă`
    case 'inactive':
      return t`Inactivă`
    case 'blank':
      return t`Fără stare în listă`
    case 'elsewhere':
      return t`În listă, sub altă autoritate`
    case 'unnamed':
      return t`În listă, fără autoritate numită`
    // „Apare": the list is published in part, so its absence is what the copy holds, not a fact of the world.
    case 'absent':
      return t`Nu apare în listă`
    case 'unread':
      return t`Lista nu era încărcată la citire`
  }
}

export function registryStateLabel(state: RegistryState, label: string | null): string {
  if (state === 'uncertain') return t`Fără o stare sigură`
  if (state === 'none') return t`Fără fișă de firmă`
  return sourceStatusLabel(label)
}

/** AMEPIP's part in its own words, or what a marker means. */
export function amepipSegmentLabel(key: string): string {
  if (key === AMEPIP_FUNCTIONING) return t({ message: 'În funcțiune', context: 'AMEPIP status' })
  if (key === AMEPIP_NONE) return t`Fără rând la AMEPIP`
  if (key === AMEPIP_UNREAD) return t`Registrul AMEPIP nu era încărcat la citire`
  if (key === AMEPIP_BLANK) return t`Fără stare în sursă`
  return sourceStatusLabel(key)
}

export function fiscalSegmentLabel(key: string): string {
  if (key === 'inactive') return t`În lista contribuabililor inactivi`
  if (key === 'active') return t`Nu e în lista inactivilor`
  if (key === 'none') return t`Fără fișă de firmă`
  return t`Fără stare fiscală în fișă`
}

/** The AMEPIP row's title: one year said as one, several as each enterprise's newest. */
export function amepipTitle(span: { readonly from: number; readonly to: number } | null): string {
  if (!span) return t`AMEPIP`
  const { from, to } = span
  return from === to ? t`AMEPIP, ${to}` : t`AMEPIP, ultimul an al fiecăreia (${from}–${to})`
}

/** A row's flag: what another source says that is not „in business". */
export function flagText(flag: Flag): string {
  switch (flag.kind) {
    case 'amepip': {
      const year = flag.year
      const status = flag.status ?? t`fără stare`
      return t`AMEPIP ${year}: ${status}`
    }
    case 'registry': {
      const label = registryStateLabel(flag.state, flag.label).toLocaleLowerCase('ro-RO')
      return t`registrul comerțului: ${label}`
    }
    case 'fiscal':
      return t`inactivă fiscal la ANAF`
  }
}

/** On a phone the net-result and headcount columns are hidden: an order by one of them says itself. */
export function hiddenSortNote(sort: PublicEnterprisePortfolioSort, year: number): string | null {
  if (sort === 'salariati') return t`Ordonate după numărul de salariați din ${year}.`
  if (sort === 'rezultat') return t`Ordonate după rezultatul net din ${year}, de la cel mai mic.`
  return null
}

// ──────────────────────────────────────────────────────────── figures ──

/** An admitted value as the hubs write it: lei rounded for reading, a headcount grouped. */
export function figureText(value: string, measure: FigureMeasure, locale: string): string {
  return measure === 'employees' ? formatCount(Number(value), locale) : formatLei(value, locale)
}

/** Why a cell has no figure, in a word or two; the word agrees with its column (cifra, numărul, rezultatul). */
export function missingText(missing: MissingFigure, measure: FigureMeasure): string {
  switch (missing.kind) {
    case 'never':
      return t`niciun bilanț`
    case 'last': {
      const year = missing.year
      return t`ultimul bilanț: ${year}`
    }
    case 'held':
      return measure === 'turnover' ? t`reținută` : t`reținut`
    case 'missing':
      return t`lipsește din bilanț`
    case 'not-admitted':
      return measure === 'turnover' ? t`neadmisă` : t`neadmis`
  }
}

/** The note under the table when it shows a held value: why, as the companies module gives it. */
export function heldNote(reasons: ReadonlySet<HeldReason>): string {
  const words = [...reasons].map((reason) => {
    switch (reason) {
      case 'profile':
        return t`formularul bilanțului nu e verificat`
      case 'observation':
        return t`observația nu trece verificarea`
      case 'quality':
        return t`un semnal de calitate`
      case 'component':
        return t`o componentă a valorii e reținută`
    }
  })
  const why = words.join('; ')
  return t`„Reținut”: verificarea bilanțurilor ține valoarea deoparte (${why}), ca pe pagina firmei. Nu e un zero.`
}

export function activityLabel(division: string | null): string {
  return division ? divisionLabel(division) : t`Fără activitate principală în fișă`
}

export function countyLabel(county: string | null): string {
  return county ? displayName(county) : t`Fără sediu în fișă`
}

// ─────────────────────────────────────────────────────── disagreements ──

/** Which source says otherwise, for one enterprise where the two part. */
export function disagreementSource(part: Disagreement): string {
  return part.kind === 'announcements-elsewhere' ? t`Anunțurile AMEPIP` : t`Lista ANAF`
}

/** What the list says when it names no authority for an enterprise the announcements put here. */
export function listNoneText(part: Disagreement & { readonly kind: 'list-none' }): string {
  return part.row.enterprise.s1001 ? t`nu-i numește autoritatea` : t`nu apare în listă`
}

export function disagreementLede(parts: readonly Disagreement[], locale: string): string {
  const count = parts.length
  return plural(count, {
    one: 'La o întreprindere, cele două surse nu numesc aceeași autoritate. Fiecare e spusă cum o scrie.',
    other: `La ${enterpriseCount(count, locale)}, cele două surse nu numesc aceeași autoritate. Fiecare e spusă cum o scrie.`,
  })
}

// ──────────────────────────────────────────────────── caveats, source ──

const LANE_NAME: Readonly<Record<string, () => string>> = {
  s1001: () => t`lista ANAF`,
  json_apt: () => t`anunțurile de selecție AMEPIP`,
  amepip: () => t`registrul AMEPIP`,
}

/** What a reader must know before trusting a figure, behind the head's one marker. */
export function portfolioCaveats(portfolio: AuthorityPortfolio): readonly string[] {
  const year = portfolio.financialYear
  const lanes = (status: string) => portfolio.sources.filter((source) => source.laneStatus === status && LANE_NAME[source.family]).map((source) => LANE_NAME[source.family]!())
  const partial = lanes('partial')
  const down = lanes('unavailable')
  return [
    t`O autoritate „controlează” o întreprindere așa cum o scrie sursa: nu e o cotă de proprietate.`,
    // The read date is the source line's: said once.
    t`Pagina e o copie, nu o citire în timp real: listele, registrele și bilanțurile se pot schimba după data din linia surselor.`,
    t`Cifrele din ${year} sunt doar cele admise de verificarea bilanțurilor, ca pe pagina firmei. Nu sunt adunate: o sumă ar amesteca firme care raportează diferit.`,
    t`Anunțurile de selecție acoperă doar selecțiile publicate de AMEPIP: o întreprindere fără anunț nu spune nimic despre autoritatea ei.`,
    ...(partial.length > 0 ? [t`Publicate parțial: ${partial.join(', ')}; sursa nu spune ce lipsește.`] : []),
    ...(down.length > 0 ? [t`Nu erau încărcate la citire: ${down.join(', ')}. Pagina nu spune nimic din ele.`] : []),
  ]
}

export function portfolioSourceLine(portfolio: AuthorityPortfolio, locale: string): string {
  const source = (family: string) => portfolio.sources.find((candidate) => candidate.family === family)
  const listDate = formatDate(s1001ListDate(source('s1001')?.sourceUrl ?? null), locale)
  const amepipDate = formatDate(source('amepip')?.sourceLastModifiedAt ?? null, locale)
  const readDate = formatDate(portfolio.generatedAt, locale)
  const from = portfolio.seapSpan.from.slice(0, 4)
  const to = portfolio.seapSpan.to.slice(0, 4)
  return [
    listDate ? t`Lista ANAF a întreprinderilor publice din ${listDate}` : t`Lista ANAF a întreprinderilor publice`,
    t`anunțurile de selecție AMEPIP`,
    amepipDate ? t`registrul AMEPIP din ${amepipDate}` : t`registrul AMEPIP`,
    t`registrul comerțului și bilanțurile`,
    t`SEAP ${from}–${to}`,
    ...(readDate ? [t`citite pe ${readDate}`] : []),
  ].join(' · ')
}
