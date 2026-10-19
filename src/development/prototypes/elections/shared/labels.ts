import { t } from '@lingui/core/macro'
import type { ElectionEvent, Family, ScopeType } from './model'

/**
 * Romanian words for the labels the sources report (Guidelines G10). A label
 * the table does not know — a source table's shape such as
 * `local_result_tippv_1` — has no word: the page shows it verbatim, marked as
 * the source's, and never guesses what it means.
 */

export function familyPlural(family: Family | null): string {
  switch (family) {
    case 'local':
      return t`Locale`
    case 'parliamentary':
      return t`Parlamentare`
    case 'presidential':
      return t`Prezidențiale`
    case 'european':
      return t`Europarlamentare`
    case 'referendum':
      return t`Referendumuri`
    default:
      return t`Negrupate`
  }
}

/** „Alegerile locale din 2024", „Referendumul din 2019": the event as a reader names it. */
export function eventTitle(event: Pick<ElectionEvent, 'family' | 'year' | 'instance'>): string {
  const year = event.year
  if (event.instance === 'partial') return t`Alegerile locale parțiale din ${year}`
  switch (event.family) {
    case 'local':
      return t`Alegerile locale din ${year}`
    case 'parliamentary':
      return t`Alegerile parlamentare din ${year}`
    case 'presidential':
      return t`Alegerile prezidențiale din ${year}`
    case 'european':
      return t`Alegerile europarlamentare din ${year}`
    case 'referendum':
      return t`Referendumul din ${year}`
    default:
      return t`Alegeri negrupate, ${year}`
  }
}

/** The short form for a row in a list of one family: „Locale 2024". */
export function eventShort(event: Pick<ElectionEvent, 'family' | 'year' | 'instance'>): string {
  const family = familyPlural(event.family)
  return event.instance === 'partial' ? t`${family} parțiale ${event.year}` : `${family} ${String(event.year)}`
}

const OFFICES: Readonly<Record<string, () => string>> = {
  mayor: () => t`Primar`,
  local_council: () => t`Consiliul local`,
  county_council: () => t`Consiliul județean`,
  'consiliu-judetean': () => t`Consiliul județean`,
  county_president: () => t`Președintele consiliului județean`,
  county_council_or_cgmb: () => t`Consiliul județean sau CGMB`,
  county_president_or_primar_general: () => t`Președinte CJ sau primar general`,
  bucharest_general_council: () => t`Consiliul General al Bucureștiului`,
  'consiliu-general': () => t`Consiliul General al Bucureștiului`,
  general_mayor: () => t`Primar general`,
  bucharest_general_mayor: () => t`Primar general`,
  chamber_deputies: () => t`Camera Deputaților`,
  senate: () => t`Senat`,
  president: () => t`Președinte`,
  european_parliament: () => t`Parlamentul European`,
  referendum: () => t`Referendum`,
}

/** The office's Romanian word, or null for a label that is not an office the table knows. */
export function officeLabel(office: string): string | null {
  return OFFICES[office]?.() ?? null
}

export function scopeLabel(scope: ScopeType): string {
  switch (scope) {
    case 'siruta':
      return t`Localitate`
    case 'source_constituency':
      return t`Numerotarea sursei`
    case 'county':
      return t`Județ`
    case 'diaspora':
      return t`Străinătate`
    case 'national':
      return t`Țară`
    case 'chamber':
      return t`Cameră`
  }
}

/** The INS UAT list's kind of place, in a word. */
export function placeKind(kind: string | undefined): string | null {
  if (!kind) return null
  if (kind.startsWith('Municipiu')) return t`municipiu`
  // INS writes „Sectoarele municipiului Bucuresti".
  if (kind.startsWith('Sectoarele')) return t`sector`
  if (kind === 'Oras') return t`oraș`
  if (kind === 'Comuna') return t`comună`
  return null
}

/** A round as the source labels it; `final` stays a label, never finality, and a missing one is said. */
export function roundLabel(round: string | null): string {
  switch (round) {
    case null:
      return t`tur neraportat`
    case 'tur1':
      return t`turul 1`
    case 'tur2':
      return t`turul 2`
    case 'tur3':
      return t`turul 3`
    default:
      return round
  }
}
