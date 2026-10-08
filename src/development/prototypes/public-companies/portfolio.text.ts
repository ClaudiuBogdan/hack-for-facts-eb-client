import { plural, t } from '@lingui/core/macro'

import { divisionLabel } from '@/features/private-companies/lib/caen-divisions'
import { displayName, enterpriseCount, formatCount, formatDate, formatLei, s1001ListDate } from '@/features/public-enterprises/lib/hub-format'
import { sourceStatusLabel } from '@/features/public-enterprises/lib/hub-text'
import type { PortfolioAuthority, PortfolioFixture } from './portfolio.data'
import {
  AMEPIP_BLANK,
  AMEPIP_FUNCTIONING,
  AMEPIP_NONE,
  disagreements,
  type Disagreement,
  type Flag,
  type ListState,
  type MissingFigure,
  type PortfolioRow,
  type RegistryState,
  type SizeMeasure,
} from './portfolio.model'

/**
 * The authority portfolio's words. The authority is the sentence's subject
 * and each count is said with the source that gives it; a control edge is
 * the source's word, never ownership.
 */

/** The authority as ANAF's list spells it (else the announcements, else its budget record), or its CUI said as a CUI. */
export function authorityTitle(authority: PortfolioAuthority): string {
  const cui = authority.cui
  return authority.name ? displayName(authority.name) : t`Autoritatea cu CUI ${cui}`
}

/** Where a name came from, when it is not ANAF's list. */
export function nameSourceNote(authority: PortfolioAuthority): string | null {
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
 * selection announcements add or say otherwise. Counts only; the statuses are
 * the page's to show.
 */
export function headSentence(authority: PortfolioAuthority, rows: readonly PortfolioRow[], locale: string): string {
  const inList = rows.filter((row) => row.inList).length
  const both = rows.filter((row) => row.inList && row.inAnnouncements).length
  const extra = rows.filter((row) => !row.inList)
  const parts = disagreements(authority.cui, rows)
  const elsewhere = parts.filter((part) => part.kind === 'announcements-elsewhere').length
  const listElsewhere = parts.filter((part) => part.kind === 'list-elsewhere').length
  if (inList === 0) {
    const lead = t`După anunțurile de selecție AMEPIP, controlează ${enterpriseCount(extra.length, locale)}`
    if (extra.length > 0 && listElsewhere === extra.length) {
      return `${lead}; ${plural(extra.length, { one: 'lista ANAF a întreprinderilor publice o pune sub altă autoritate.', other: 'lista ANAF a întreprinderilor publice le pune sub alte autorități.' })}`
    }
    return `${lead}; ${t`lista ANAF a întreprinderilor publice nu o numește pentru niciuna.`}`
  }
  const sentences = [t`După lista ANAF a întreprinderilor publice, controlează ${enterpriseCount(inList, locale)}.`]
  const added = enterpriseCount(extra.length, locale)
  if (both > 0 && extra.length > 0) sentences.push(t`Anunțurile de selecție AMEPIP o numesc pentru ${formatCount(both, locale)} dintre ele și pentru încă ${added}, pe care lista nu le pune sub ea.`)
  else if (both > 0) sentences.push(plural(both, { one: 'Anunțurile de selecție AMEPIP o numesc pentru una dintre ele.', other: 'Anunțurile de selecție AMEPIP o numesc pentru # dintre ele.' }))
  else if (extra.length > 0) sentences.push(t`Anunțurile de selecție AMEPIP o mai numesc pentru ${added}, pe care lista nu le pune sub ea.`)
  if (elsewhere > 0) sentences.push(plural(elsewhere, { one: 'Pentru una dintre cele din listă, anunțurile numesc altă autoritate.', other: 'Pentru # dintre cele din listă, anunțurile numesc altă autoritate.' }))
  return sentences.join(' ')
}

// ──────────────────────────────────────────────────────────── status ──

export function listStateLabel(state: ListState): string {
  switch (state) {
    case 'active':
      return t`Activă`
    case 'inactive':
      return t`Inactivă`
    case 'blank':
      return t`Fără stare în listă`
    case 'absent':
      return t`Nu e în listă`
  }
}

/** A group's title in the status variant: the list's word, plural. */
export function listGroupTitle(state: ListState): string {
  switch (state) {
    case 'active':
      return t`Active în lista ANAF`
    case 'inactive':
      return t`Inactive în lista ANAF`
    case 'blank':
      return t`În lista ANAF, fără stare`
    case 'absent':
      return t`Nu sunt în lista ANAF`
  }
}

export function registryStateLabel(state: RegistryState, label: string | null): string {
  if (state === 'uncertain') return t`Fără o stare sigură`
  if (state === 'none') return t`Fără fișă de firmă`
  return sourceStatusLabel(label)
}

/** One source's part, in its words: AMEPIP's own status text, or what its absence means. */
export function amepipSegmentLabel(key: string): string {
  if (key === AMEPIP_FUNCTIONING) return t`În funcțiune`
  if (key === AMEPIP_NONE) return t`Fără rând la AMEPIP`
  if (key === AMEPIP_BLANK) return t`Fără stare în sursă`
  return sourceStatusLabel(key)
}

export function fiscalSegmentLabel(key: string): string {
  if (key === 'inactive') return t`În lista contribuabililor inactivi`
  if (key === 'active') return t`Nu e în lista inactivilor`
  return t`Fără fișă de firmă`
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

/** Where the row's link to this authority comes from, when it is not ANAF's list alone. */
export function membershipMark(row: PortfolioRow, elsewhere: boolean): string | null {
  if (!row.inList) return t`doar în anunțurile AMEPIP`
  if (elsewhere) return t`anunțurile numesc altă autoritate`
  return null
}

// ──────────────────────────────────────────────────────────── size ──

export function measureLabel(measure: SizeMeasure, year: number): string {
  if (measure === 'cifra') return t`Cifra de afaceri ${year}`
  if (measure === 'salariati') return t`Salariați ${year}`
  return t`Rezultat net ${year}`
}

/** An admitted value as the hubs write it: lei rounded for reading, a headcount grouped. */
export function figureText(value: string, measure: SizeMeasure, locale: string): string {
  return measure === 'salariati' ? formatCount(Number(value), locale) : formatLei(value, locale)
}

/** Why a cell has no figure, in a word or two; the value's gender follows its column (cifra, numărul, rezultatul). */
export function missingText(missing: MissingFigure, measure: SizeMeasure): string {
  switch (missing.kind) {
    case 'held':
      return measure === 'cifra' ? t`reținută` : t`reținut`
    case 'missing':
      return t`lipsește din bilanț`
    case 'never':
      return t`niciun bilanț`
    case 'older': {
      const year = missing.year
      return t`ultimul bilanț: ${year}`
    }
    case 'newer': {
      const year = missing.year
      return t`bilanț doar din ${year}`
    }
    case 'not-admitted':
      return measure === 'cifra' ? t`neadmisă` : t`neadmis`
  }
}

/** The note under a list with held values: why, as the companies module gives it. */
export function heldNote(reasons: ReadonlySet<string>): string {
  const words = [...reasons].map((reason) => {
    if (reason === 'profile') return t`formularul bilanțului nu e verificat`
    if (reason === 'observation') return t`observația nu trece verificarea`
    if (reason === 'quality') return t`un semnal de calitate`
    return t`o componentă a valorii e reținută`
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

/** What the other source says, for one enterprise where the two part. */
export function disagreementText(part: Disagreement): { readonly source: string; readonly says: string } {
  switch (part.kind) {
    case 'announcements-elsewhere':
      return { source: t`Anunțurile AMEPIP`, says: part.others.map((other) => (other.name ? displayName(other.name) : t`CUI ${other.cui}`)).join(', ') }
    case 'list-elsewhere':
      return { source: t`Lista ANAF`, says: part.others.map((other) => (other.name ? displayName(other.name) : t`CUI ${other.cui}`)).join(', ') }
    case 'list-none':
      return { source: t`Lista ANAF`, says: part.row.enterprise.s1001 ? t`nu-i numește autoritatea` : t`nu o are` }
  }
}

export function disagreementLede(parts: readonly Disagreement[], locale: string): string {
  const count = parts.length
  return plural(count, {
    one: 'La o întreprindere, cele două surse nu numesc aceeași autoritate. Fiecare e spusă cum o scrie.',
    other: `La ${enterpriseCount(count, locale)}, cele două surse nu numesc aceeași autoritate. Fiecare e spusă cum o scrie.`,
  })
}

// ──────────────────────────────────────────────────── caveats, source ──

export function portfolioCaveats(fixture: PortfolioFixture, locale: string): readonly string[] {
  const date = formatDate(fixture.generatedAt, locale)
  const year = fixture.financialYear
  const partial = fixture.sources.filter((source) => source.laneStatus === 'partial' && source.family !== 'amepip').map((source) => (source.family === 's1001' ? t`lista ANAF` : t`anunțurile de selecție AMEPIP`))
  return [
    t`O autoritate „controlează” o întreprindere așa cum o scrie sursa: nu e o cotă de proprietate.`,
    date ? t`Pagina e citită din API pe ${date}; listele, registrele și bilanțurile se pot schimba între timp.` : t`Pagina e o copie citită din API; listele, registrele și bilanțurile se pot schimba între timp.`,
    t`Cifrele din ${year} sunt doar cele admise de verificarea bilanțurilor, ca pe pagina firmei. Nu sunt adunate: o sumă ar amesteca firme care raportează diferit.`,
    t`Anunțurile de selecție acoperă doar selecțiile publicate de AMEPIP: o întreprindere fără anunț nu spune nimic despre autoritatea ei.`,
    ...(partial.length > 0 ? [t`Publicate parțial: ${partial.join(', ')}; sursa nu spune ce lipsește.`] : []),
  ]
}

export function portfolioSourceLine(fixture: PortfolioFixture, locale: string): string {
  const listDate = formatDate(s1001ListDate(fixture.sources.find((source) => source.family === 's1001')?.sourceUrl ?? null), locale)
  const amepipDate = formatDate(fixture.sources.find((source) => source.family === 'amepip')?.sourceLastModifiedAt ?? null, locale)
  const readDate = formatDate(fixture.generatedAt, locale)
  const from = fixture.seapSpan.from.slice(0, 4)
  const to = fixture.seapSpan.to.slice(0, 4)
  return [
    listDate ? t`Lista ANAF a întreprinderilor publice din ${listDate}` : t`Lista ANAF a întreprinderilor publice`,
    t`anunțurile de selecție AMEPIP`,
    amepipDate ? t`registrul AMEPIP din ${amepipDate}` : t`registrul AMEPIP`,
    t`registrul comerțului și bilanțurile`,
    t`SEAP ${from}–${to}`,
    ...(readDate ? [t`citite pe ${readDate}`] : []),
  ].join(' · ')
}
