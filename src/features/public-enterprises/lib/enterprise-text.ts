import { plural, t } from '@lingui/core/macro'

import { yearRanges } from '@/features/private-companies/lib/company-profile-format'
import type { BuyerProfile } from '@/features/procurement/lib/buyer-model'
import { frameworksCount } from '@/features/procurement/lib/contract-text'
import { contractsCount, directPurchasesCount, moneyText } from '@/features/procurement/lib/home-format'
import { periodLongText } from '@/features/procurement/lib/profile-period-text'
import type { PublicEnterpriseRead } from '@/schemas/public-enterprise-profile'
import {
  PAGE_LANES,
  controlAgreement,
  downLanes,
  isLaneDown,
  laneOf,
  s1001State,
  sameAuthority,
  type ControlRow,
  type PageLane,
  type ControlSource,
  type IndicatorGroupKey,
  type IndicatorTables,
} from './enterprise-model'
import { displayName, formatCount, formatDate, s1001ListDate } from './hub-format'
import type { PublicEnterpriseAuthorityKind } from './hub-snapshot-types'

/**
 * `/public-enterprises/$cui`'s words. Each source is named as the hub names it
 * (lista ANAF, registrul AMEPIP, anunțurile de selecție AMEPIP) and each status
 * keeps its source. The control sentence makes the authority its subject
 * („Consiliul Local Sibiu o controlează"), so no participle has to agree with
 * the enterprise's legal form.
 */

export function sourceLabel(source: ControlSource): string {
  return source === 's1001' ? t`Lista ANAF` : t`Anunțurile de selecție AMEPIP`
}

/** A local authority's kind, singular, from its own budget record. */
export function kindLabel(kind: PublicEnterpriseAuthorityKind): string | null {
  switch (kind) {
    case 'county':
      return t`județ`
    case 'municipality':
      return t`municipiu`
    case 'town':
      return t`oraș`
    case 'commune':
      return t`comună`
    case 'sector':
      return t`sector al Bucureștiului`
    default:
      return null
  }
}

export function levelLabel(level: 'central' | 'local' | null): string | null {
  return level === 'central' ? t`nivel central` : level === 'local' ? t`nivel local` : null
}

/** ANAF's S1001 word for the enterprise, as a reader says it; a word it may add later stays its own. */
export function s1001Word(raw: string | null): string {
  const word = raw?.trim() ?? ''
  if (word === '') return t`fără stare`
  if (word.toUpperCase() === 'ACTIV') return t`activă`
  if (word.toUpperCase() === 'INACTIV') return t`inactivă`
  return word.toLocaleLowerCase('ro-RO')
}

/**
 * Where a shown name comes from: the row's own source; the other source,
 * naming the same CUI; the authority's budget record (which names the
 * territory, „Municipiul Sibiu", not the council); or nowhere, the CUI alone.
 */
export type NameOrigin = 'own' | 'other' | 'budget' | 'none'

export type ShownName = { readonly name: string; readonly origin: NameOrigin; readonly from: ControlSource | null }

/**
 * The name a row is shown by: its source's own spelling; where that source
 * gave none, the other source's for the same authority, credited to it, before
 * the budget record's; else the CUI, said as a CUI, never as a name.
 */
export function shownName(row: ControlRow, rows: readonly ControlRow[]): ShownName {
  if (row.name) return { name: displayName(row.name), origin: 'own', from: row.source }
  const other = rows.find((entry) => entry !== row && sameAuthority(entry, row) && entry.name)
  if (other?.name) return { name: displayName(other.name), origin: 'other', from: other.source }
  if (row.budgetName) return { name: displayName(row.budgetName), origin: 'budget', from: null }
  return { name: row.authorityCui ? t`Autoritatea cu CUI ${row.authorityCui}` : t`O autoritate fără nume în sursă`, origin: 'none', from: null }
}

/** Where a name not the source's own came from, as a row's mark says it; null for the source's own or the bare CUI. */
export function originMark(shown: ShownName): string | null {
  if (shown.origin === 'other') return shown.from === 's1001' ? t`nume din lista ANAF` : t`nume din anunțurile AMEPIP`
  if (shown.origin === 'budget') return t`nume din fișa de buget`
  return null
}

/** A name in a sentence that credits a source: one the source did not give says where it came from. */
function sentenceName(row: ControlRow, rows: readonly ControlRow[]): string {
  const shown = shownName(row, rows)
  if (shown.origin === 'other') return shown.from === 's1001' ? t`${shown.name} (numele din lista ANAF)` : t`${shown.name} (numele din anunțurile AMEPIP)`
  if (shown.origin === 'budget') return t`${shown.name} (numele din fișa ei de buget)`
  return shown.name
}

/** „A și B": the names of the rows, each once. */
function names(rows: readonly ControlRow[], all: readonly ControlRow[]): string {
  const unique = [...new Set(rows.map((row) => sentenceName(row, all)))]
  if (unique.length <= 1) return unique[0] ?? ''
  return `${unique.slice(0, -1).join(', ')} ${t`și`} ${unique[unique.length - 1]}`
}

/** A source as a sentence names it. */
export function laneName(family: PageLane): string {
  switch (family) {
    case 's1001':
      return t`lista ANAF`
    case 'amepip':
      return t`registrul AMEPIP`
    case 'json_apt':
      return t`anunțurile de selecție AMEPIP`
  }
}

/**
 * Who controls it, in one or two sentences: ANAF's list first, then the
 * announcements only when they name another authority or the list names none.
 * A list the API reports unavailable is said to be unread, never absent.
 */
export function controlSentence(read: PublicEnterpriseRead, rows: readonly ControlRow[]): string {
  if (!read.profile?.isCurrentMember) return t`Nu mai apare în nicio listă a întreprinderilor publice.`
  const listDown = isLaneDown(read.profile, 's1001')
  // In ANAF's list is its own fact (an observation), apart from whether the list names the authority (an edge).
  const listed = s1001State(read.profile).listed
  const agreement = controlAgreement(rows)
  if (agreement === 'none') {
    const announcementsDown = isLaneDown(read.profile, 'json_apt')
    if (listDown && announcementsDown) return t`Listele care îi numesc autoritatea nu sunt încărcate acum.`
    if (listDown) return t`Lista ANAF nu e încărcată acum; anunțurile de selecție AMEPIP nu-i numesc autoritatea.`
    if (announcementsDown) {
      return listed
        ? t`E în lista ANAF, care nu-i numește autoritatea; anunțurile de selecție AMEPIP nu sunt încărcate acum.`
        : t`Nu e în lista ANAF; anunțurile de selecție AMEPIP nu sunt încărcate acum.`
    }
    return listed ? t`E în lista ANAF, dar nicio listă nu-i numește autoritatea.` : t`Nicio listă nu numește autoritatea care o controlează.`
  }
  const s1001 = rows.filter((row) => row.source === 's1001')
  const apt = rows.filter((row) => row.source === 'json_apt')
  if (s1001.length === 0) {
    if (listDown) return t`${names(apt, rows)} o controlează, după anunțurile de selecție AMEPIP; lista ANAF nu e încărcată acum.`
    return listed
      ? t`${names(apt, rows)} o controlează, după anunțurile de selecție AMEPIP; lista ANAF nu-i numește autoritatea.`
      : t`${names(apt, rows)} o controlează, după anunțurile de selecție AMEPIP; nu e în lista ANAF.`
  }
  const first = t`${names(s1001, rows)} o controlează, după lista ANAF a întreprinderilor publice.`
  if (agreement === 'one') return isLaneDown(read.profile, 'json_apt') ? `${first} ${t`Anunțurile de selecție AMEPIP nu sunt încărcate acum.`}` : first
  if (agreement !== 'different') return first
  // Another authority is one with a CUI none of the list's carries; a row with no CUI cannot be told apart, and is said as such.
  const others = apt.filter((row) => row.authorityCui !== null && !s1001.some((other) => sameAuthority(row, other)))
  const uncoded = apt.filter((row) => row.authorityCui === null)
  if (others.length > 0) return `${first} ${t`Anunțurile de selecție AMEPIP numesc altă autoritate: ${names(others, rows)}.`}`
  if (uncoded.length > 0) return `${first} ${t`Anunțurile de selecție AMEPIP numesc și, fără CUI: ${names(uncoded, rows)}.`}`
  // The announcements name fewer, not others: they are said to name only those.
  return `${first} ${t`Anunțurile de selecție AMEPIP numesc doar: ${names(apt, rows)}.`}`
}

/**
 * The control band's lede: that the two sources agree, the one thing the
 * head's sentence does not say. Who controls it, and a disagreement, are the
 * head's, never said twice.
 */
export function controlLede(rows: readonly ControlRow[]): string | null {
  return controlAgreement(rows) === 'same' ? t`Lista ANAF și anunțurile de selecție AMEPIP numesc aceeași autoritate.` : null
}

/** How many enterprises the lists give an authority, this one included. */
export function peersText(total: number, locale: string): string {
  const n = formatCount(total, locale)
  return plural(total, {
    one: `o întreprindere în liste`,
    few: `${n} întreprinderi în liste`,
    other: `${n} de întreprinderi în liste`,
  })
}

/** The list's date as a reader writes it, read off the file's name; null when the name holds none. */
export function listDateText(read: PublicEnterpriseRead, locale: string): string | null {
  return formatDate(s1001ListDate(laneOf(read.profile, 's1001')?.sourceUrl ?? null), locale)
}

export function groupLabel(group: IndicatorGroupKey): string {
  switch (group) {
    case 'finance':
      return t`Finanțe`
    case 'governance':
      return t`Conducere`
    case 'people':
      return t`Angajați`
    case 'gender':
      return t`Egalitate de gen`
    case 'environment':
      return t`Mediu`
    case 'innovation':
      return t`Inovare`
    case 'clients':
      return t`Clienți`
    case 'other':
      return t`Altele`
  }
}

/**
 * What it bought in the period, as the procurement institution page says it
 * (its activity clause): „În ultimele 12 luni (iunie 2025 – mai 2026) a făcut
 * 1.490 de achiziții directe, de 2,1 mil. lei fără TVA, și a atribuit 10
 * contracte." An unread count is unknown, never zero.
 */
export function spendingLede(profile: BuyerProfile): string {
  const period = periodLongText(profile.period)
  const direct = profile.direct.count
  const awards = profile.awards.count
  if (direct === null && awards === null) return t`Achizițiile din ${period} nu s-au putut citi acum.`
  const frameworks = profile.frameworks ?? 0
  const bought =
    direct !== null && direct > 0
      ? profile.direct.value !== null
        ? t`În ${period} a făcut ${directPurchasesCount(direct)}, de ${moneyText(profile.direct.value)} fără TVA`
        : t`În ${period} a făcut ${directPurchasesCount(direct)}`
      : null
  const awarded = awards !== null && awards > 0 ? contractsCount(awards) : null
  const signed = !awarded && frameworks > 0 ? frameworksCount(frameworks) : null
  // A count not read is unknown: said so, never „none".
  if (bought) {
    if (awarded) return t`${bought}, și a atribuit ${awarded}.`
    if (awards === null) return t`${bought}; contractele atribuite nu s-au putut citi acum.`
    return signed ? t`${bought}, și a semnat ${signed}.` : `${bought}.`
  }
  if (direct === null) return awarded ? t`În ${period} a atribuit ${awarded}; achizițiile directe nu s-au putut citi acum.` : t`Achizițiile directe din ${period} nu s-au putut citi acum.`
  if (awarded) return t`În ${period} a atribuit ${awarded}.`
  if (signed) return awards === null ? t`În ${period} a semnat ${signed}; contractele atribuite nu s-au putut citi acum.` : t`În ${period} a semnat ${signed}.`
  if (awards === null) return t`În ${period} nu are achiziții directe publicate în SEAP; contractele atribuite nu s-au putut citi acum.`
  return t`În ${period} nu are achiziții publicate în SEAP.`
}

/** The source line: each source with its date, once per page. */
export function sourceLine(read: PublicEnterpriseRead, locale: string, statements: string | null): string {
  const listDate = listDateText(read, locale)
  const amepipDate = formatDate(laneOf(read.profile, 'amepip')?.sourceLastModifiedAt ?? null, locale)
  return [
    listDate ? t`Lista ANAF a întreprinderilor publice din ${listDate}` : t`Lista ANAF a întreprinderilor publice`,
    amepipDate ? t`registrul AMEPIP din ${amepipDate}` : t`registrul AMEPIP`,
    t`anunțurile de selecție AMEPIP`,
    statements ? t`registrul comerțului și ${statements}` : t`registrul comerțului`,
    t`SEAP`,
  ].join(' · ')
}

/** What a reader must know before trusting a figure on this page, each only when it applies. */
export function pageCaveats(read: PublicEnterpriseRead, rows: readonly ControlRow[], tables: IndicatorTables | null): readonly string[] {
  const notes: string[] = []
  if (rows.length > 0) notes.push(t`O autoritate „controlează” o întreprindere așa cum o scrie sursa: nu e o cotă de proprietate.`)
  const partial = PAGE_LANES.filter((family) => laneOf(read.profile, family)?.laneStatus === 'partial')
  if (partial.length > 0) notes.push(t`Publicate parțial: ${partial.map(laneName).join(', ')}; sursa nu spune ce lipsește.`)
  const down = downLanes(read.profile)
  if (down.length > 0) notes.push(t`Nu sunt încărcate acum: ${down.map(laneName).join(', ')}. Pagina nu spune nimic din ele.`)
  if (tables?.calculated) {
    notes.push(
      t`AMEPIP notează „%” și fracții (0,0113), și procente (50). Cinci rate calculate din bilanț (marja netă, ROE, ROA, creșterea cifrei de afaceri și a profitului, aceasta verificată pe anii cu profit) sunt fracții: comparate cu bilanțurile a 40 de întreprinderi, 809 din 818 valori se potrivesc, așa că sunt arătate ca procente. Restul, cu „%” în galben, rămân cum sunt scrise: scara lor nu e spusă.`,
    )
  }
  if (tables?.form) notes.push(t`Formularul AMEPIP e raportat de întreprindere și nu e verificat; unele valori ies din unitatea lor; „%” în galben e scris cum îl dă sursa.`)
  // With no sheet to show, the AMEPIP band's own lede says the years it held back.
  if (tables && (tables.calculated || tables.form) && tables.withheldFormYears.length > 0) {
    notes.push(
      t`În anii fără formular (${yearRanges(tables.withheldFormYears)}), AMEPIP are totuși valori pentru dividende, investiții și cercetare; nu sunt arătate: un 0 de acolo poate fi o căsuță goală.`,
    )
  }
  notes.push(t`Valorile din SEAP sunt cele atribuite, nu plățile efective.`)
  return notes
}
