import { t } from '@lingui/core/macro'
import type { RawCaBuyer, RawCaRow, RawCaWinner, RawContractAward, RawContractAwardTotal, RawContractAwards } from '../api/graphql/procurement-contract-award-queries'
import { lastDayOf, type ProfilePeriod } from './profile-period'

/**
 * Contract awards served from procurement v3 (PROC-KB0Z step 1): the shapes a
 * buyer's band and an award's page read, and the rules that say a party.
 *
 * - The published window starts on 1 January 2021 (owner, 24 November 2026):
 *   a record from before it exists, and the API does not publish it yet. The
 *   pages say „not published yet", never „none" or „not loaded".
 * - Counts only: no lei sum until the owner decides one. A record's own
 *   amount is shown; a record under identity review is shown, never summed.
 * - A party is said as the API serves it (D6; root, 24 November 2026,
 *   PROC-KR9T): only a company the API names links to its pages; a masked
 *   person, a code alone, a withheld or unidentified winner, and any kind the
 *   client does not know, are plain text — the last with nothing at all.
 */

/**
 * An answer's `disclosureKey` when the API could not read the names view: every winner is served with no code or name.
 * Not an error, and not a key: the page says the winners cannot be named now (procurement-da-api, 25 November 2026).
 */
export const CA_NAMES_UNAVAILABLE = 'unavailable'

/** The first year of the published window. */
export const CA_FLOOR_YEAR = 2021
export const CA_FLOOR_DAY = `${CA_FLOOR_YEAR}-01-01`

/** How many records a page of a buyer's list holds (the API allows 50). */
export const CA_PAGE_SIZE = 20

export const CA_SORTS = ['awardDayDesc', 'awardDayAsc', 'amountDesc'] as const
export type CaSort = (typeof CA_SORTS)[number]

const SOURCE_NAME = /^[a-z][a-z0-9_]{0,63}$/u
const PORTAL_ID = /^[0-9A-Za-z_-]{1,64}$/u

/** A contract award's id (`<source>:ca:<publication id>:<contract id>`), as the API parses it; anything else is no award. */
export function isContractAwardId(id: string): boolean {
  const parts = id.split(':')
  return parts.length === 4 && SOURCE_NAME.test(parts[0]!) && parts[1] === 'ca' && PORTAL_ID.test(parts[2]!) && PORTAL_ID.test(parts[3]!)
}

/**
 * The days of a profile period the API publishes: from its first day, raised
 * to the floor, to its last. The counts, the list and the money all read this
 * one window (the totals do not raise a start themselves). Null for a period
 * that ends before the floor: nothing in it is published yet, and nothing is
 * asked. `clipped`: the period starts before the floor, and the page says its
 * first part is not published yet.
 */
export function caWindowOf(period: Pick<ProfilePeriod, 'from' | 'through' | 'year'>): { readonly from: string; readonly to: string; readonly clipped: boolean } | null {
  const start = `${period.from}-01`
  const to = period.through ? lastDayOf(period.through) : `${period.year}-12-31`
  if (to < CA_FLOOR_DAY) return null
  const clipped = start < CA_FLOOR_DAY
  return { from: clipped ? CA_FLOOR_DAY : start, to, clipped }
}

// ─────────────────────────────────────────────────────────── parties ──

/**
 * A party as the page may say it:
 * - `company`: by its name (or its code where the API gives no name); a link
 *   only with both (`isLinkedCaParty`);
 * - `masked`: a masked name the API gave, with its code when given;
 * - `code`: a code the API gives with no name;
 * - `withheld`: the API names no one and gives no code;
 * - `unidentified`: SEAP gave no usable code.
 */
export type CaPartyShown =
  | { readonly kind: 'company'; readonly name: string | null; readonly code: string | null }
  | { readonly kind: 'masked'; readonly name: string; readonly code: string | null }
  | { readonly kind: 'code'; readonly code: string }
  | { readonly kind: 'withheld' }
  | { readonly kind: 'unidentified' }

const clean = (value: string | null | undefined): string | null => value?.trim() || null

/** A winner as served. A kind the client does not know is withheld: a code or a name under it is not known to be shown. */
export function caWinnerShown(winner: Pick<RawCaWinner, 'displayKind' | 'fiscalCode' | 'name'>): CaPartyShown {
  const code = clean(winner.fiscalCode)
  const name = clean(winner.name)
  switch (winner.displayKind) {
    case 'company':
      return name || code ? { kind: 'company', name, code } : { kind: 'unidentified' }
    case 'person_masked':
      return name ? { kind: 'masked', name, code } : code ? { kind: 'code', code } : { kind: 'withheld' }
    case 'code_only':
      return code ? { kind: 'code', code } : { kind: 'withheld' }
    case 'unidentified':
      return { kind: 'unidentified' }
    default:
      return { kind: 'withheld' }
  }
}

/**
 * A buyer as served: an authority by its name, or its code where the API has
 * none; a person by the masked name the API gives, never one looked up by
 * code; a buyer of unknown kind by its code alone.
 */
export function caBuyerShown(buyer: Pick<RawCaBuyer, 'displayKind' | 'fiscalCode' | 'name'>): CaPartyShown & { readonly authority: boolean } {
  const code = clean(buyer.fiscalCode)
  const name = clean(buyer.name)
  // An authority links to its page, which takes a CUI of digits only.
  if (buyer.displayKind === 'authority') return { kind: 'company', name, code, authority: code !== null && /^\d{1,12}$/u.test(code) }
  if (buyer.displayKind === 'person_masked' && name) return { kind: 'masked', name, code, authority: false }
  return code ? { kind: 'code', code, authority: false } : { kind: 'withheld', authority: false }
}

/** A winner that may link to the supplier's pages: a company the API names, with its code (PROC-KR9T). */
export function isLinkedCaParty(shown: CaPartyShown): shown is { readonly kind: 'company'; readonly name: string; readonly code: string } {
  return shown.kind === 'company' && shown.name !== null && shown.code !== null && /^\d{1,12}$/u.test(shown.code)
}

/** A party's label, as a list or a sentence says it. */
export function caPartyLabel(shown: CaPartyShown, role: 'winner' | 'buyer' = 'winner'): string {
  switch (shown.kind) {
    case 'company': {
      if (shown.name) return shown.name
      const code = shown.code ?? ''
      return role === 'buyer' ? t`CUI ${code}` : t`CUI ${code} (denumire indisponibilă în registrul firmelor)`
    }
    case 'masked': {
      const { name, code } = shown
      return code ? t`${name} (CUI ${code})` : name
    }
    case 'code': {
      const code = shown.code
      return t`CUI ${code} (nume nepublicat)`
    }
    case 'withheld':
      return role === 'buyer' ? t`Cumpărător nepublicat` : t`Câștigător nepublicat`
    case 'unidentified':
      return t`Câștigător fără cod fiscal valid`
  }
}

// ──────────────────────────────────────────────────────────── records ──

export interface CaWinner {
  readonly order: number | null
  readonly shown: CaPartyShown
}

export interface CaRecordRow {
  readonly recordId: string
  /** `ordinary` | `call_off` | `framework_agreement` | null. */
  readonly contractKind: string | null
  /** `framework_ceiling`: the most the framework may spend, not an award. */
  readonly ceiling: boolean
  /** Under identity review: shown, in no total. */
  readonly underReview: boolean
  readonly amountLei: number | null
  readonly nativeAmount: number | null
  readonly currency: string | null
  readonly flags: readonly string[]
  readonly awardDay: string | null
  readonly title: string | null
  readonly cpvCode: string | null
  readonly winnerCount: number
  readonly winners: readonly CaWinner[]
}

const amountOf = (text: string | null): number | null => {
  if (text === null || text.trim() === '') return null
  const value = Number(text)
  return Number.isFinite(value) ? value : null
}

function rowOf(raw: RawCaRow): CaRecordRow {
  return {
    recordId: raw.recordId,
    contractKind: raw.contractKind,
    ceiling: raw.valueKind === 'framework_ceiling',
    underReview: raw.status !== 'awarded' || !raw.additive,
    amountLei: amountOf(raw.amountLei),
    nativeAmount: amountOf(raw.nativeAmount),
    currency: clean(raw.currency),
    flags: raw.flags,
    awardDay: raw.awardDay,
    title: clean(raw.title),
    cpvCode: clean(raw.cpvCode),
    winnerCount: raw.winnerCount,
    winners: [...raw.winners].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)).map((winner) => ({ order: winner.order, shown: caWinnerShown(winner) })),
  }
}

/** A buyer's contract awards in a period: its counts and one page of its records, read in one snapshot. */
export interface BuyerContractAwards {
  readonly dataAsOf: string
  /** The names view was not readable for the read (`disclosureKey` `unavailable`): no winner carries a code or a name. */
  readonly winnersUnnamed: boolean
  /** The first day published (the floor). */
  readonly floor: string
  readonly recordCount: number
  readonly valuedCount: number
  readonly identityReviewCount: number
  /** The buyer's records with no award day, which no dated list or count includes. */
  readonly undatedCount: number
  readonly rows: readonly CaRecordRow[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
  readonly hasMore: boolean
  /** The period holds more records than a list may reach: the page says to narrow it. */
  readonly depthLimited: boolean
}

export function mapBuyerContractAwards(raw: RawContractAwards): BuyerContractAwards {
  const { summary, records } = raw
  return {
    dataAsOf: summary.dataAsOf,
    winnersUnnamed: summary.disclosureKey === CA_NAMES_UNAVAILABLE || records.disclosureKey === CA_NAMES_UNAVAILABLE,
    floor: summary.window.floor,
    recordCount: summary.recordCount,
    valuedCount: summary.valuedCount,
    identityReviewCount: summary.identityReviewCount,
    undatedCount: summary.undatedCount,
    rows: records.items.map(rowOf),
    page: records.page,
    pageSize: records.pageSize,
    total: records.total,
    hasMore: records.hasMore,
    depthLimited: records.depthLimited,
  }
}

export interface CaLot {
  readonly order: number
  readonly number: string | null
  readonly title: string | null
  readonly cpvCode: string | null
  /** An estimate as published: never a total, never an award. */
  readonly estimatedValue: number | null
  readonly currency: string | null
  readonly euFunded: boolean | null
  readonly cancelled: boolean
}

export interface ContractAward extends CaRecordRow {
  readonly dataAsOf: string
  /** The names view was not readable for the read: no winner carries a code or a name. */
  readonly winnersUnnamed: boolean
  /** `excluded` | `included` | `unknown`. */
  readonly vatBasis: string
  readonly fxSource: string | null
  /** The latest observed change in reported price, in lei; not added to the amount. */
  readonly changeLei: number | null
  readonly changeDay: string | null
  readonly publicationDay: string | null
  readonly buyer: (CaPartyShown & { readonly authority: boolean }) | null
  readonly procedureId: string | null
  readonly noticeNo: string | null
  readonly sourceUrl: string | null
  readonly lotCount: number
  readonly lots: readonly CaLot[]
}

/** A portal page only: any other address is not shown as SEAP's. */
function portalUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && (parsed.hostname === 'e-licitatie.ro' || parsed.hostname.endsWith('.e-licitatie.ro')) ? parsed.toString() : null
  } catch {
    return null
  }
}

export function mapContractAward(raw: RawContractAward): ContractAward {
  const { record } = raw
  return {
    ...rowOf(record),
    dataAsOf: raw.dataAsOf,
    winnersUnnamed: raw.disclosureKey === CA_NAMES_UNAVAILABLE,
    vatBasis: record.vatBasis,
    fxSource: record.fxSource,
    changeLei: amountOf(record.changeLei),
    changeDay: record.changePublicationDay,
    publicationDay: record.publicationDay,
    buyer: record.buyer ? caBuyerShown(record.buyer) : null,
    procedureId: clean(record.procedureId),
    noticeNo: clean(record.noticeNo),
    sourceUrl: portalUrl(record.sourceUrl),
    lotCount: record.lotCount,
    lots: raw.lots.map((lot) => ({
      order: lot.lotOrder,
      number: clean(lot.lotNumber),
      title: clean(lot.title),
      cpvCode: clean(lot.cpvCode),
      estimatedValue: amountOf(lot.estimatedValue),
      currency: clean(lot.currency),
      euFunded: lot.isEuFunded,
      // `cancelled` | `not_cancelled` | `unknown` | `not_expected`: only the first is a cancelled lot.
      cancelled: lot.cancelledStatus === 'cancelled',
    })),
  }
}

/** What a record's flags and status mean for a reader; a flag the page has no words for says nothing. */
export function caRecordNotes(record: Pick<CaRecordRow, 'flags' | 'underReview' | 'currency' | 'winnerCount'>): readonly string[] {
  const notes: string[] = []
  if (record.underReview) notes.push(t`Identitatea contractului e în verificare: valoarea lui nu intră în niciun total.`)
  const flags = new Set(record.flags)
  if (flags.has('joint_win') || record.winnerCount > 1) notes.push(t`Câștigat de o asociere: valoarea e a întregului contract; SEAP nu publică partea fiecărei firme.`)
  if (flags.has('foreign_equivalent') && record.currency) {
    const currency = record.currency
    notes.push(t`Valoarea în lei e echivalată din ${currency}, moneda publicată.`)
  }
  if (flags.has('native_disagreement')) notes.push(t`Valorile publicate în SEAP pentru acest contract nu se potrivesc între ele.`)
  if (flags.has('zero')) notes.push(t`Valoarea publicată în SEAP e zero.`)
  if (flags.has('negative')) notes.push(t`Valoarea publicată în SEAP e negativă, o greșeală a sursei.`)
  return notes
}

/** The buyer's name for a title or a description: an authority's only, never a person's masked name. */
export function authorityNameOf(award: Pick<ContractAward, 'buyer'> | null | undefined): string | null {
  const buyer = award?.buyer
  return buyer && buyer.kind === 'company' && buyer.authority ? buyer.name : null
}

/**
 * The value kinds a buyer's contract-award money is shown in, in this order
 * (owner, 25 November 2026): what was awarded, the price changes after award,
 * and the framework agreements' ceilings. One figure each, never added up: a
 * ceiling is the most an agreement may spend, not an award.
 */
export const CA_TOTAL_KINDS = ['awarded', 'modification_change', 'framework_ceiling'] as const
export type CaTotalKind = (typeof CA_TOTAL_KINDS)[number]

/** Text in both languages, as the API's label table serves it. */
export interface CaServedText {
  readonly ro: string
  readonly en: string
}

export interface CaTotalFigure {
  readonly valueKind: CaTotalKind
  readonly label: CaServedText
  readonly sumLei: number
  readonly recordCount: number
}

export interface BuyerContractAwardTotals {
  readonly figures: readonly CaTotalFigure[]
  /** Composed by the API from the filters it applied and its counts: shown verbatim. */
  readonly explanation: CaServedText
}

/** One figure per asked kind, in `CA_TOTAL_KINDS` order; a kind the answer lacks is left out, never said as zero. */
export function mapBuyerContractAwardTotals(raw: RawContractAwardTotal): BuyerContractAwardTotals {
  const figures: CaTotalFigure[] = []
  for (const valueKind of CA_TOTAL_KINDS) {
    const figure = raw.totals.find((entry) => entry.valueKind === valueKind)
    const sumLei = Number(figure?.sumLei)
    if (!figure || !Number.isFinite(sumLei)) continue
    const label = raw.included.valueKinds.find((entry) => entry.key === valueKind)
    figures.push({
      valueKind,
      // A label the build lacks is shown as the API would: its key, never a guessed text.
      label: { ro: label?.labelRo ?? valueKind, en: label?.labelEn ?? valueKind },
      sumLei,
      recordCount: Number(figure.recordCount) || 0,
    })
  }
  return { figures, explanation: { ro: raw.explanation.textRo, en: raw.explanation.textEn } }
}
