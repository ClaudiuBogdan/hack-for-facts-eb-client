import type { I18n, MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type {
  ElectionAllocationPhase,
  ElectionCompetitor,
  ElectionFamily,
  ElectionOccurrenceKind,
  ElectionPlace,
  ElectionPlaceType,
  ElectionRound,
} from '@/schemas/elections-catalog'

/**
 * The elections pages' words that two places build: the route's `head` (with
 * the request's translator) and the page (with `useLingui()`'s), so a format
 * string cannot drift between them. The API's closed vocabularies (families,
 * offices, place types, kinds, rounds, phases) translate; place and party
 * names stay as the API spells them.
 */

const SITE = 'Transparenta.eu'

function suffix(i18n: I18n): string {
  return `${i18n._(msg`Alegeri`)} — ${SITE}`
}

export function buildCatalogDocumentTitle(i18n: I18n): string {
  return suffix(i18n)
}

const FAMILY_LABEL: Readonly<Record<ElectionFamily, MessageDescriptor>> = {
  local: msg`Alegeri locale`,
  parliamentary: msg`Alegeri parlamentare`,
  presidential: msg`Alegeri prezidențiale`,
  european: msg`Alegeri europarlamentare`,
  referendum: msg`Referendum`,
}

export function familyLabel(i18n: I18n, family: ElectionFamily): string {
  return i18n._(FAMILY_LABEL[family])
}

/** An event by its family and year, both parts of its key: „Alegeri locale 2024". */
export function eventName(i18n: I18n, event: { readonly family: ElectionFamily; readonly year: number }): string {
  return `${familyLabel(i18n, event.family)} ${String(event.year)}`
}

/** An event is named by its family and year once read, else by its key. */
export function buildEventDocumentTitle(
  i18n: I18n,
  options: { readonly eventKey: string; readonly event?: { readonly family: ElectionFamily; readonly year: number } | null },
): string {
  const eventKey = options.eventKey
  return `${options.event ? eventName(i18n, options.event) : i18n._(msg`Alegerea ${eventKey}`)} — ${SITE}`
}

/** A contest is named by its place and office: „VICTORIA · Primar — …". */
export function buildContestDocumentTitle(
  i18n: I18n,
  options: { readonly contestKey: string; readonly place?: string | null; readonly office?: string | null },
): string {
  const contestKey = options.contestKey
  const named = options.place && options.office ? `${options.place} · ${options.office}` : options.place || options.office
  return `${named || i18n._(msg`Scrutinul ${contestKey}`)} — ${suffix(i18n)}`
}

/** The offices the API serves today; any other office shows as the API's own code. */
const OFFICE_LABEL: ReadonlyMap<string, MessageDescriptor> = new Map([
  ['mayor', msg`Primar`],
  ['local_council', msg`Consiliu local`],
  ['county_council', msg`Consiliu județean`],
  ['county_council_president', msg`Președinte de consiliu județean`],
  ['general_mayor', msg`Primar general`],
  ['general_council', msg`Consiliul General al Municipiului București`],
  ['chamber', msg`Camera Deputaților`],
  ['senate', msg`Senat`],
  ['president', msg`Președinte`],
  ['european_parliament', msg`Parlamentul European`],
])

export function officeLabel(i18n: I18n, office: string): string {
  const label = OFFICE_LABEL.get(office)
  return label ? i18n._(label) : office
}

const PLACE_TYPE_LABEL: Readonly<Record<ElectionPlaceType, MessageDescriptor>> = {
  uat: msg`Localitate`,
  county: msg`Județ`,
  national: msg`Național`,
  diaspora: msg`Diaspora`,
}

export function placeTypeLabel(i18n: I18n, placeType: ElectionPlaceType): string {
  return i18n._(PLACE_TYPE_LABEL[placeType])
}

/** A place by its name as the API spells it; the country and the diaspora have none, and an unknown code shows its key. */
export function placeName(i18n: I18n, place: Pick<ElectionPlace, 'name' | 'placeType' | 'placeKey'>): string {
  if (place.name !== null) return place.name
  if (place.placeType === 'national') return i18n._(msg`România`)
  if (place.placeType === 'diaspora') return i18n._(msg`Diaspora`)
  return place.placeKey
}

const KIND_LABEL: Readonly<Record<ElectionOccurrenceKind, MessageDescriptor>> = {
  general: msg`vot general`,
  runoff: msg`balotaj`,
  repeat: msg`vot repetat`,
  partial: msg`vot parțial`,
}

export function ballotDayKindLabel(i18n: I18n, kind: ElectionOccurrenceKind): string {
  return i18n._(KIND_LABEL[kind])
}

export function roundLabel(i18n: I18n, round: ElectionRound): string {
  return round === 'unknown' ? i18n._(msg`necunoscut`) : round.slice(1)
}

const PHASE_LABEL: Readonly<Record<Exclude<ElectionAllocationPhase, 'none'>, MessageDescriptor>> = {
  man_1: msg`prima repartizare`,
  man_2: msg`a doua repartizare`,
  final: msg`repartizarea finală`,
}

export function allocationPhaseLabel(i18n: I18n, phase: ElectionAllocationPhase): string {
  return phase === 'none' ? '' : i18n._(PHASE_LABEL[phase])
}

/** A competitor by the API's label; an independent is a person, whose name the page never shows. */
export function competitorName(i18n: I18n, competitor: ElectionCompetitor): string {
  return competitor.label ?? i18n._(msg`Candidat independent`)
}

/** An ISO date in the reader's language, read as the calendar day it names; anything else as it came. */
export function formatIsoDate(locale: string, value: string): string {
  const day = /^\d{4}-\d{2}-\d{2}/u.exec(value)?.[0]
  if (day === undefined) return value
  const date = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

/** A count the API serves as a decimal string, exact at any size. */
export function formatCount(locale: string, value: string): string {
  return new Intl.NumberFormat(locale).format(BigInt(value))
}

/** A share the API rounded to two decimals, shown with both. */
export function formatPercent(locale: string, percent: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(percent) / 100)
}

/** Percentage points, with the API's two decimals. */
export function formatPoints(locale: string, points: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(points))
}
