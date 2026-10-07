import { plural, t } from '@lingui/core/macro'

import type { PublicEnterpriseAuthorityKind } from '@/features/public-enterprises/lib/hub-snapshot-types'
import { yearRanges } from '@/features/private-companies/lib/company-profile-format'
import { displayName, formatCount, formatDate, s1001ListDate } from '@/features/public-enterprises/lib/hub-format'
import type { EnterpriseRead } from './enterprise.data'
import {
  amepipYears,
  controlAgreement,
  isFunctioning,
  laneOf,
  s1001State,
  type ControlRow,
  type ControlSource,
  type IndicatorGroupKey,
  type IndicatorTables,
} from './enterprise.model'

/**
 * The enterprise page's words: each source named as the hub names it (lista
 * ANAF, registrul AMEPIP, anunțurile de selecție AMEPIP), each status with its
 * source, the control sentence with the authority as its subject so no
 * participle has to agree with the enterprise's legal form.
 */

export function sourceLabel(source: ControlSource): string {
  return source === 's1001' ? t`Lista ANAF` : t`Anunțurile de selecție AMEPIP`
}

/** The authority's kind, singular, from its own budget record. */
export function kindLabel(kind: PublicEnterpriseAuthorityKind): string {
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
    case 'central_authority':
      return t`autoritate centrală`
    case 'public_entity':
      return t`instituție publică centrală`
    case 'education':
      return t`educație`
    case 'unresolved':
      return t`fără fișă în buget`
  }
}

export function levelLabel(level: 'central' | 'local' | null): string | null {
  return level === 'central' ? t`nivel central` : level === 'local' ? t`nivel local` : null
}

/** ANAF's S1001 word for the enterprise, as a reader says it; a word it may add later stays its own. */
export function s1001Word(raw: string | null): string {
  if (raw === null || raw.trim() === '') return t`fără stare`
  if (raw.trim().toUpperCase() === 'ACTIV') return t`activă`
  if (raw.trim().toUpperCase() === 'INACTIV') return t`inactivă`
  return raw.trim().toLocaleLowerCase('ro-RO')
}

/** An authority's name as its row shows it, with where the name came from when it is not the source's. */
export function authorityText(row: ControlRow): { readonly name: string; readonly borrowed: boolean } {
  if (row.name) return { name: displayName(row.name), borrowed: false }
  if (row.budgetName) return { name: displayName(row.budgetName), borrowed: true }
  return { name: row.authorityCui ? t`Autoritatea cu CUI ${row.authorityCui}` : t`Autoritate fără nume`, borrowed: true }
}

/**
 * Who controls it, in one or two sentences: ANAF's list first, then the
 * announcements only when they name another authority or the list names none.
 */
export function controlSentence(read: EnterpriseRead, rows: readonly ControlRow[]): string {
  if (!read.profile?.isCurrentMember) return t`Nu mai apare în nicio listă a întreprinderilor publice.`
  const agreement = controlAgreement(rows)
  if (agreement === 'none') return t`Nicio listă nu numește autoritatea care o controlează.`
  const s1001 = rows.filter((row) => row.source === 's1001')
  const apt = rows.filter((row) => row.source === 'json_apt')
  const names = (list: readonly ControlRow[]) => list.map((row) => authorityText(row).name).join(t` și `)
  if (s1001.length === 0) return t`${names(apt)} o controlează, după anunțurile de selecție AMEPIP; nu e în lista ANAF.`
  const first = t`${names(s1001)} o controlează, după lista ANAF a întreprinderilor publice.`
  if (agreement !== 'different') return first
  return `${first} ${t`Anunțurile de selecție AMEPIP numesc altă autoritate: ${names(apt.filter((row) => !s1001.some((other) => other.authorityCui === row.authorityCui)))}.`}`
}

export function peersText(total: number, locale: string): string {
  const n = formatCount(total, locale)
  return plural(total, {
    one: `o întreprindere în liste`,
    few: `${n} întreprinderi în liste`,
    other: `${n} de întreprinderi în liste`,
  })
}

/** The status band's lede: whether the sources agree that it is in business, each named. */
export function statusLede(read: EnterpriseRead, registryText: string | null): string {
  const list = s1001State(read.profile)
  const years = amepipYears(read.profile)
  const last = years[years.length - 1] ?? null
  const parts: string[] = []
  parts.push(list.listed ? t`Lista ANAF o dă ${s1001Word(list.raw)}` : t`Nu e în lista ANAF`)
  if (last) parts.push(isFunctioning(last.status) ? t`registrul AMEPIP, în funcțiune în ${last.year}` : t`registrul AMEPIP, „${last.status ?? t`fără stare`}” în ${last.year}`)
  if (registryText) parts.push(t`registrul comerțului, „${registryText.toLocaleLowerCase('ro-RO')}”`)
  return `${parts.join('; ')}.`
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

/** The source line: each source with its date, once per page. */
export function sourceLine(read: EnterpriseRead, locale: string, statements: string | null): string {
  const s1001 = laneOf(read.profile, 's1001')
  const amepip = laneOf(read.profile, 'amepip')
  const listDate = formatDate(s1001ListDate(s1001?.sourceUrl ?? null), locale)
  const amepipDate = formatDate(amepip?.sourceLastModifiedAt ?? null, locale)
  const parts = [
    listDate ? t`Lista ANAF a întreprinderilor publice din ${listDate}` : t`Lista ANAF a întreprinderilor publice`,
    amepipDate ? t`registrul AMEPIP din ${amepipDate}` : t`registrul AMEPIP`,
    t`anunțurile de selecție AMEPIP`,
    statements ? t`registrul comerțului și ${statements}` : t`registrul comerțului`,
    t`SEAP`,
  ]
  const read_ = formatDate(read.readAt, locale)
  return read_ ? `${parts.join(' · ')} · ${t`citite pe ${read_}`}` : parts.join(' · ')
}

/** What a reader must know before trusting a figure on this page, each only when it applies. */
export function pageCaveats(read: EnterpriseRead, rows: readonly ControlRow[], tables: IndicatorTables): readonly string[] {
  const notes: string[] = []
  if (rows.length > 0) notes.push(t`O autoritate „controlează” o întreprindere așa cum o scrie sursa: nu e o cotă de proprietate.`)
  if (controlAgreement(rows) === 'different') notes.push(t`Lista ANAF și anunțurile de selecție AMEPIP numesc autorități diferite; amândouă sunt arătate.`)
  const partial = (['s1001', 'json_apt'] as const).filter((family) => laneOf(read.profile, family)?.laneStatus === 'partial')
  if (partial.length > 0) notes.push(t`Lista ANAF și anunțurile de selecție AMEPIP sunt publicate parțial; sursa nu spune ce lipsește.`)
  if (tables.calculated || tables.form) {
    notes.push(t`AMEPIP notează „%” și fracții (0,0113), și procente (50). Ratele calculate din bilanț sunt fracții: comparate cu bilanțurile a 40 de întreprinderi, 523 din 526 se potrivesc; le arătăm ca procente. Cota de piață și formularul rămân cum sunt scrise.`)
    notes.push(t`Formularul AMEPIP e raportat de întreprindere și nu e verificat; unele valori ies din unitatea lor.`)
  }
  if (tables.withheldFormYears.length > 0) {
    notes.push(t`În anii fără formular (${yearRanges(tables.withheldFormYears)}), AMEPIP are totuși valori pentru dividende, investiții și cercetare; nu le arătăm: un 0 de acolo poate fi o căsuță goală.`)
  }
  notes.push(t`Contractele și achizițiile din SEAP sunt numărate, nu adunate: o atribuire nu e o plată.`)
  return notes
}
