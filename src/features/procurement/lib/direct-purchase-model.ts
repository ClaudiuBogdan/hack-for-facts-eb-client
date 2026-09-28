import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import type { DaDetail, DaDetailAvailability, DirectAcquisitionRecord, Party } from '@/schemas/procurement'
import { buyerName, type BuyerIdentity } from './buyer-model'
import { DIRECT_COMPARABLE_FROM, homeYear, tidyName, tidyTitle } from './home-model'
import { cpvDivisionLabelEn, cpvDivisionLabelRo } from './cpv-labels'

/**
 * One direct purchase's page (`/procurement/direct-acquisitions/$id`): the
 * purchase itself — the record, its lines and terms — and its context, the
 * institution and the firm beyond it. The two are read and shown apart: the
 * purchase is the page, the context a band after it (`design.md` §16).
 */

// ─────────────────────────────────────────────────────────── the purchase ──

/**
 * Where SEAP has the record from: a catalogue purchase's own page on
 * e-licitatie (the only family with lines and terms), a row of SEAP's
 * quarterly export (a catalogue purchase the discovery missed), or an award
 * notification for a purchase made outside the catalogue.
 */
export type DpFamily = 'catalog' | 'export' | 'notification'

/**
 * How it ended. A catalogue purchase is a purchase once both sides accepted;
 * the firm can refuse the institution's conditions (or let them lapse), the
 * institution can refuse the firm's offer (or let it lapse). The export
 * families list done purchases: SEAP reports them, it does not say how they
 * ended. A cancelled record whose detail is not read is `stopped`: not a
 * purchase, the page cannot say by whom.
 */
export type DpOutcome =
  | { readonly kind: 'accepted' }
  | { readonly kind: 'reported' }
  | { readonly kind: 'firm-refused'; readonly reason: string | null }
  | { readonly kind: 'firm-late' }
  | { readonly kind: 'institution-refused'; readonly reason: string | null }
  | { readonly kind: 'institution-late' }
  | { readonly kind: 'stopped' }
  | { readonly kind: 'unknown' }

/** A label the API gives in both languages; the page picks one as it renders. */
export interface DpLabel {
  readonly ro: string | null
  readonly en: string | null
}

export interface DpParty {
  /** Null when SEAP carries no identifier the platform could read. */
  readonly cui: string | null
  readonly name: string
  /** The budget platform's record of an institution it knows — what it is and where, said as the page renders („Spital, județul Mureș"). */
  readonly identity: BuyerIdentity | null
  readonly hasBudget: boolean
}

/**
 * The same product sold by the same firm to other institutions in the
 * purchase's year — matched on the firm's catalogue code, the product's name
 * and unit, from three other institutions up. The API does not serve it yet
 * (`design.md` §16.2): the page shows it where it arrives.
 */
export interface DpPeers {
  readonly buyers: number
  readonly lines: number
  readonly min: number
  readonly median: number
  readonly max: number
}

export interface DpItem {
  readonly index: number
  readonly code: string | null
  readonly name: string
  /** The catalogue's description, when it says more than the name. */
  readonly description: string | null
  readonly unit: string | null
  readonly cpvLabel: DpLabel | null
  readonly quantity: number | null
  readonly unitPrice: number | null
  /** The firm's catalogue price, only when the price paid differs from it. */
  readonly catalogPrice: number | null
  /** Quantity × price, computed by the database. */
  readonly line: number | null
  readonly peers: DpPeers | null
  /** How many other times the institution bought the same product from the firm in the year; null when not read. */
  readonly repeats: number | null
}

/** One side's decision in a catalogue purchase, with its time limit. */
export interface DpDecision {
  readonly at: string | null
  readonly deadline: string | null
}

export type DpContractType = 'supply' | 'services' | 'works'

export interface DpDetail {
  readonly description: string | null
  readonly delivery: string | null
  readonly payment: string | null
  readonly contractType: DpContractType | null
  /** The EU programme named, when the purchase is EU-funded. */
  readonly euFund: string | null
  readonly documents: number
  /** The free text is withheld: it carries a person's contact details. */
  readonly redacted: boolean
  readonly firm: DpDecision
  readonly institution: DpDecision
  readonly items: readonly DpItem[]
  /** The lines' sum, when it differs from the purchase's value (the source's own numbers disagree). */
  readonly itemsTotal: number | null
}

export type DpSource =
  | { readonly kind: 'page'; readonly url: string }
  /** A quarterly XLSX on data.gov.ro; `file` is its quarter („T2 2025") when its name says it. */
  | { readonly kind: 'export'; readonly url: string; readonly file: string | null }
  | { readonly kind: 'none' }

export interface DirectPurchase {
  readonly id: string
  readonly code: string | null
  readonly title: string | null
  readonly family: DpFamily
  readonly outcome: DpOutcome
  /** Excluding VAT: the accepted value of a purchase, the offer of an attempt. */
  readonly value: number | null
  /** A value SEAP published that did not pass the platform's checks: said, never shown as the value. */
  readonly unverifiedValue: number | null
  /** The institution's estimate, only when it differs from the value. */
  readonly estimate: number | null
  readonly published: string | null
  readonly finalized: string | null
  readonly cpv: { readonly code: string; readonly label: DpLabel } | null
  readonly authority: DpParty
  readonly supplier: DpParty
  readonly source: DpSource
  /** Other SEAP sources that publish the same purchase, which the platform counts once. */
  readonly alsoIn: readonly DpFamily[]
  readonly detail: DpDetail | null
  readonly availability: DaDetailAvailability
  /** A read failed (names, or the detail just now): served, never kept or cached. */
  readonly partial: boolean
}

// ─────────────────────────────────────────────────────────── the context ──

export interface DpYear {
  readonly year: number
  readonly count: number
  readonly value: number | null
}

/** Another record between the same institution and firm. */
export interface DpOther {
  readonly id: string
  readonly code: string | null
  readonly title: string | null
  readonly value: number | null
  readonly date: string | null
  readonly done: boolean
}

/**
 * The institution and the firm over the purchase's year (the year in
 * progress through SEAP's cutoff month, or the purchase's month if later),
 * and the pair every year from 2019 to the year in progress. A part whose
 * read failed is null — never a zero — and the context `partial`.
 */
export interface DpContext {
  readonly year: number
  /** The last month read when the year is in progress: `2026-05`. */
  readonly through: string | null
  /** The pair's years, 2019 to `last`; null when not read. */
  readonly years: readonly DpYear[] | null
  /** The last year the pair's years run to — the year in progress when its months are read, else the last complete one — and, in progress, its last month read. */
  readonly last: { readonly year: number; readonly through: string | null }
  /** The purchases between them in the explorer's list from 2019 (which leaves out the cancelled); `estimated` when the API only estimates the count. */
  readonly records: { readonly count: number; readonly estimated: boolean } | null
  /** The pair in the purchase's year. */
  readonly pair: { readonly count: number; readonly value: number | null } | null
  /** The institution's year: its direct purchases, its firms (`more`: past a hundred, the API tells only that there are more) and this firm's place by money. */
  readonly buyer: { readonly count: number; readonly value: number | null; readonly sellers: number; readonly more: boolean; readonly rank: number | null } | null
  /** The firm's year: its direct sales, its institutions and this institution's place by money. */
  readonly seller: { readonly count: number; readonly value: number | null; readonly clients: number; readonly more: boolean; readonly rank: number | null } | null
  /** The records around this one between the same two, newest first, this one included; empty when not read. */
  readonly others: readonly DpOther[]
  /** A read failed: the rest stands, said. */
  readonly partial: boolean
}

// ────────────────────────────────────────────────────────────── mapping ──

export function familyOf(sourceSystem: string): DpFamily {
  if (sourceSystem === 'elicitatie_da') return 'catalog'
  return sourceSystem === 'seap_dan' ? 'notification' : 'export'
}

const PURCHASE_STATUSES: ReadonlySet<string> = new Set(['finalized', 'awarded', 'closed'])

/**
 * How a record ended, from SEAP's status and — for a cancelled catalogue
 * purchase — its detail: a reason names who refused; without one, the side
 * that never decided let it lapse. Text withheld for privacy withholds the
 * reasons too, so such a record is only `stopped`.
 */
export function outcomeOf(status: string, family: DpFamily, detail: DaDetail | null): DpOutcome {
  if (family !== 'catalog') return status === 'cancelled' ? { kind: 'stopped' } : { kind: 'reported' }
  if (PURCHASE_STATUSES.has(status)) return { kind: 'accepted' }
  if (status !== 'cancelled') return { kind: 'unknown' }
  if (!detail || detail.textRedacted) return { kind: 'stopped' }
  if (detail.supplierRejectionReason) return { kind: 'firm-refused', reason: detail.supplierRejectionReason }
  if (detail.caRejectionReason) return { kind: 'institution-refused', reason: detail.caRejectionReason }
  return detail.supplierDecisionDate ? { kind: 'institution-late' } : { kind: 'firm-late' }
}

export function isPurchase(outcome: DpOutcome): boolean {
  return outcome.kind === 'accepted' || outcome.kind === 'reported'
}

/** An attempt that did not become a purchase: refused, lapsed or stopped — not a record whose end SEAP does not say. */
export function isAttempt(outcome: DpOutcome): boolean {
  return !isPurchase(outcome) && outcome.kind !== 'unknown'
}

function numberOf(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const sameText = (a: string, b: string) => a.trim().toLocaleLowerCase('ro-RO') === b.trim().toLocaleLowerCase('ro-RO')

/** A CPV code as the labels are keyed: eight digits, the check digit dropped. */
export function cpvKey(code: string | null): string | null {
  const digits = code?.match(/^\d{8}/)?.[0]
  return digits ?? null
}

function contractTypeOf(text: string | null): DpContractType | null {
  const key = text?.trim().toLocaleLowerCase('ro-RO')
  if (key === 'furnizare') return 'supply'
  if (key === 'servicii') return 'services'
  if (key === 'lucrari' || key === 'lucrări') return 'works'
  return null
}

/** SEAP's own CPV text is Romanian only. */
function textLabel(text: string | null): DpLabel | null {
  return text ? { ro: text, en: null } : null
}

/** A CPV code's label from the API, else its division's. */
function cpvLabelOf(code: string, labels: ReadonlyMap<string, DpLabel>): DpLabel {
  const division = code.slice(0, 2)
  const ro = cpvDivisionLabelRo(division)
  // The English division label is the platform's own only where a Romanian one is: past it, it is a sentence in the page's language.
  return labels.get(code) ?? { ro, en: ro !== null ? cpvDivisionLabelEn(division) : null }
}

/** SEAP's CPV text without its revision tag: „Aranjamente florale (Rev.2)" → „Aranjamente florale". */
function cpvTextOf(text: string | null): string | null {
  const clean = text?.replace(/\s*\(Rev\.\s*2\)\s*$/iu, '').trim()
  return clean ? clean : null
}

function itemOf(raw: DaDetail['items'][number], labels: ReadonlyMap<string, DpLabel>): DpItem {
  const quantity = numberOf(raw.itemQuantity)
  const unitPrice = numberOf(raw.unitPrice)
  const catalogPrice = numberOf(raw.catalogUnitPrice)
  const name = tidyTitle(raw.catalogItemName) ?? tidyTitle(raw.catalogItemDescription) ?? raw.catalogItemCode ?? '—'
  const description = raw.catalogItemDescription && raw.catalogItemName && !sameText(raw.catalogItemDescription, raw.catalogItemName) ? raw.catalogItemDescription.trim() : null
  const key = cpvKey(raw.cpvCode)
  return {
    index: raw.itemIndex,
    code: raw.catalogItemCode,
    name,
    description,
    unit: raw.itemMeasureUnit,
    cpvLabel: (key ? labels.get(key) : undefined) ?? textLabel(cpvTextOf(raw.cpvText)),
    quantity,
    unitPrice,
    catalogPrice: catalogPrice !== null && unitPrice !== null && catalogPrice !== unitPrice ? catalogPrice : null,
    line: numberOf(raw.lineValue) ?? (quantity !== null && unitPrice !== null ? quantity * unitPrice : null),
    peers: null,
    repeats: null,
  }
}

function detailOf(raw: DaDetail, labels: ReadonlyMap<string, DpLabel>): DpDetail {
  return {
    description: raw.description?.trim() || null,
    delivery: raw.deliveryCondition?.trim() || null,
    payment: raw.paymentCondition?.trim() || null,
    contractType: contractTypeOf(raw.contractTypeText),
    euFund: raw.isEuFunded ? raw.euFundText?.trim() || null : null,
    documents: raw.documentCount,
    redacted: raw.textRedacted,
    firm: { at: raw.supplierDecisionDate, deadline: raw.supplierDecisionDeadline },
    institution: { at: raw.caDecisionDate, deadline: raw.caDecisionDeadline },
    items: [...raw.items].sort((a, b) => a.itemIndex - b.itemIndex).map((item) => itemOf(item, labels)),
    itemsTotal: raw.itemsReconciled === false ? numberOf(raw.itemsTotal) : null,
  }
}

/** „…-t2-2025.xlsx", „…-tiii-2025.xlsx", „…-t_iv_2025.xlsx": SEAP names its quarterly files every way. */
const QUARTER = /(?:^|[-_])t[-_]?(iv|i{1,3}|[1-4])[-_](\d{4})\.xlsx$/iu
const ROMAN_QUARTER: Readonly<Record<string, string>> = { i: '1', ii: '2', iii: '3', iv: '4' }

/** The quarter an export file's name says („…-t2-2025.xlsx", „…-tiii-2025.xlsx"), or null. */
export function exportQuarterOf(url: string): string | null {
  const match = url.match(QUARTER)
  if (!match?.[1] || !match[2]) return null
  const quarter = ROMAN_QUARTER[match[1].toLowerCase()] ?? match[1]
  return `T${quarter} ${match[2]}`
}

function sourceOf(url: string | null, family: DpFamily): DpSource {
  const clean = url?.trim()
  if (!clean) return { kind: 'none' }
  return family === 'catalog' ? { kind: 'page', url: clean } : { kind: 'export', url: clean, file: exportQuarterOf(clean) }
}

/** The names a follow-up read gives: the spine's labels, the budget platform's record of the institution, the CPV labels. */
export interface DpNames {
  readonly labels: ReadonlyMap<string, string>
  readonly authority: { readonly name: string; readonly identity: BuyerIdentity; readonly hasBudget: boolean } | null
  readonly cpv: ReadonlyMap<string, DpLabel>
  /** The read failed: the record's own names stand. */
  readonly failed: boolean
}

export const NO_NAMES: DpNames = { labels: new Map(), authority: null, cpv: new Map(), failed: false }

const CUI_PREFIX = /^[`'"]?\s*(?:RO|R)?\s*(\d{4,10})\s+(?=\p{L})/iu

/**
 * SEAP sometimes writes the institution's own CUI before its name („R 361684
 * Banca Nationala a Romaniei") and the platform then reads no CUI at all;
 * the name is shown without it (the CUI itself is the server's to recover).
 * A number that is not the party's CUI is part of its name („2004 IMPEX SRL").
 */
function withoutCuiPrefix(name: string, cui: string | null): string {
  const match = name.match(CUI_PREFIX)
  if (!match || (cui !== null && match[1] !== cui.replace(/\D/gu, ''))) return name
  return name.slice(match[0].length)
}

/** The record's own name for a party: its display name, unless that is only the CUI (the spine had no label), then SEAP's. */
function recordName(party: Party): string | null {
  const display = party.displayName?.trim()
  if (display && !/^\d+$/u.test(display)) return display
  return party.name?.trim() || display || null
}

/** The spine's label first, else the record's name without a CUI written before it; the CUI last. */
function rawPartyName(party: Party, labels: ReadonlyMap<string, string>): string {
  const label = party.cui ? labels.get(party.cui) : undefined
  const own = recordName(party)
  return label ?? (own ? withoutCuiPrefix(own, party.cui) : null) ?? party.cui ?? '—'
}

const SOURCE_SYSTEMS: ReadonlySet<string> = new Set(['elicitatie_da', 'seap_da', 'seap_dan'])

/** The other sources a record's duplicates come from, its own left out. */
function alsoInOf(family: DpFamily, sourceSystems: readonly string[]): readonly DpFamily[] {
  const families = sourceSystems.filter((system) => SOURCE_SYSTEMS.has(system)).map(familyOf)
  return [...new Set(families)].filter((other) => other !== family)
}

/** The record, its detail and the names, as the page shows them; `duplicates` are the source systems of the records SEAP publishes it again as. */
export function mapDirectPurchase(
  record: DirectAcquisitionRecord,
  detail: DaDetail | null,
  availability: DaDetailAvailability,
  names: DpNames,
  duplicates: readonly string[] = [],
): DirectPurchase {
  const family = familyOf(record.sourceSystem)
  const outcome = outcomeOf(record.status, family, availability === 'AVAILABLE' ? detail : null)
  const own = numberOf(record.valueRon)
  const accepted = record.value?.valueAccepted ? numberOf(record.value.valueRonComparable) : null
  // A purchase shows its checked value; an attempt shows its offer, marked as one.
  const value = isPurchase(outcome) ? accepted : own
  const estimate = numberOf(record.estimatedValueRon)
  const cpvCode = cpvKey(record.cpvCode)
  const authorityCui = record.authority.cui
  return {
    id: record.id,
    code: record.uniqueCode,
    title: tidyTitle(record.title),
    family,
    outcome,
    value,
    unverifiedValue: value === null && own !== null ? own : null,
    estimate: estimate !== null && own !== null && estimate !== own ? estimate : null,
    published: record.publicationDate,
    finalized: record.finalizationDate,
    cpv: cpvCode ? { code: cpvCode, label: cpvLabelOf(cpvCode, names.cpv) } : null,
    authority: {
      cui: authorityCui,
      name: names.authority?.name ?? buyerName(tidyName(rawPartyName(record.authority, names.labels)), null, false),
      identity: names.authority?.identity ?? null,
      hasBudget: names.authority?.hasBudget ?? false,
    },
    supplier: {
      cui: record.supplier.cui,
      // As the firm's own page names it: short words (legal forms, initials) kept in capitals.
      name: displayCompanyName(rawPartyName(record.supplier, names.labels)),
      identity: null,
      hasBudget: false,
    },
    source: sourceOf(record.sourceUrl, family),
    alsoIn: alsoInOf(family, duplicates),
    detail: availability === 'AVAILABLE' && detail ? detailOf(detail, names.cpv) : null,
    availability,
    partial: names.failed || availability === 'TEMPORARILY_UNAVAILABLE',
  }
}

// ──────────────────────────────────────────────────────────── the basket ──

/** A line the value leaves out: the lines add up to more than the value by exactly one line's amount — dropped after the offer. */
export function excludedLine(purchase: DirectPurchase): DpItem | null {
  const detail = purchase.detail
  if (!detail || detail.itemsTotal === null || purchase.value === null) return null
  const gap = detail.itemsTotal - purchase.value
  if (gap <= 0) return null
  return detail.items.find((item) => item.line !== null && Math.abs(item.line - gap) < 0.01) ?? null
}

/** The basket sorted by money — where it went — a line of unknown money last. */
export function byMoney(items: readonly DpItem[]): readonly DpItem[] {
  return [...items].sort((a, b) => (b.line ?? -1) - (a.line ?? -1) || a.index - b.index)
}

/** SEAP often titles a basket with one of its lines („Stugeron…" for six medicines); then the rest are counted after it. */
export function titleNamesOneLine(purchase: DirectPurchase): boolean {
  const items = purchase.detail?.items ?? []
  const title = purchase.title
  return items.length > 1 && title !== null && items.some((item) => sameText(item.name, title))
}

/** The day that dates the record: its finalisation, else its publication. */
export function dayOf(purchase: Pick<DirectPurchase, 'finalized' | 'published'>): string | null {
  return purchase.finalized ?? purchase.published
}

/** The day the page dates a record by: an attempt by its request (its publication — a cancelled record's other date is its end), anything else by `dayOf`. */
export function shownDayOf(purchase: Pick<DirectPurchase, 'finalized' | 'published' | 'outcome'>): string | null {
  return isAttempt(purchase.outcome) ? (purchase.published ?? purchase.finalized) : dayOf(purchase)
}

/** The year a party's procurement page opens on: the purchase's, when the pages have it; else their default. */
export function linkYearOf(purchase: Pick<DirectPurchase, 'finalized' | 'published'>, latest: number = homeYear()): number | undefined {
  const day = dayOf(purchase)
  const year = day ? Number(day.slice(0, 4)) : null
  return year !== null && year >= DIRECT_COMPARABLE_FROM && year <= latest + 1 ? year : undefined
}

// ─────────────────────────────────────────────────────────── the context ──

/** The explorer's list between the two from 2019, as the band counts: the legacy rows before it do not compare. */
export const LISTED_FROM = `${DIRECT_COMPARABLE_FROM}-01-01`

/** What the context reads need from the record: both parties and its dates. */
export interface DpContextInput {
  readonly id: string
  readonly authorityCui: string
  readonly supplierCui: string
  /** The day that places the record among the others between them: its publication (the list filters by it). */
  readonly day: string
  /** The day that dates it in the figures: its finalisation, as the analysis dates a direct purchase. */
  readonly yearDay: string
}

/**
 * Why a purchase has no context to read: SEAP gives no CUI for one side, no
 * date at all, or a date before 2019 (the legacy rows cannot tell a purchase
 * from a refused offer). Null when it has one.
 */
export type DpContextGap = 'no-cui' | 'no-date' | 'before-comparable'

export function contextGapOf(purchase: DirectPurchase): DpContextGap | null {
  if (!purchase.authority.cui || !purchase.supplier.cui) return 'no-cui'
  const yearDay = dayOf(purchase)
  if (!yearDay) return 'no-date'
  return Number(yearDay.slice(0, 4)) < DIRECT_COMPARABLE_FROM ? 'before-comparable' : null
}

export function contextInputOf(purchase: DirectPurchase): DpContextInput | null {
  const day = purchase.published ?? purchase.finalized
  const yearDay = dayOf(purchase)
  if (contextGapOf(purchase) !== null || !purchase.authority.cui || !purchase.supplier.cui || !day || !yearDay) return null
  return { id: purchase.id, authorityCui: purchase.authority.cui, supplierCui: purchase.supplier.cui, day, yearDay }
}

/**
 * The months the context's figures cover: the purchase's calendar year when
 * it is complete; in the year in progress, through SEAP's cutoff month, or
 * the purchase's own month when that is later (the figures then hold it).
 */
export function contextPeriodOf(day: string, latest: number, cutoff: string | null): { readonly year: number; readonly from: string; readonly to: string; readonly through: string | null } {
  const year = Number(day.slice(0, 4))
  if (year <= latest) return { year, from: `${year}-01`, to: `${year}-12`, through: null }
  const month = day.slice(0, 7)
  const through = cutoff && cutoff > month ? cutoff : month
  return { year, from: `${year}-01`, to: through, through }
}

/** Every purchase between them since 2019, and the first year with one; null when the years were not read. */
export function purchasesSince(context: DpContext): { readonly count: number; readonly since: number | null } | null {
  if (context.years === null) return null
  const done = context.years.filter((year) => year.count > 0)
  return { count: done.reduce((sum, year) => sum + year.count, 0), since: done[0]?.year ?? null }
}

export function shareOf(part: number | null, whole: number | null): number | null {
  return part !== null && whole !== null && whole > 0 ? part / whole : null
}

/** How many days after an attempt its redo may come: within the week, so a weekly order's next one is not taken for it. */
const REDO_DAYS = 6

/** A refused or lapsed attempt's redo: the nearest done record between the same two with the same title, on the day the attempt ended or within the week after. */
export function redoOf(purchase: DirectPurchase, context: DpContext | null): DpOther | null {
  const day = dayOf(purchase)
  const title = purchase.title
  if (!isAttempt(purchase.outcome) || !day || !title || !context) return null
  let nearest: { readonly other: DpOther; readonly after: number } | null = null
  for (const other of context.others) {
    if (!other.done || other.id === purchase.id || !other.date || !other.title || !sameText(other.title, title)) continue
    const after = (Date.parse(`${other.date.slice(0, 10)}T00:00:00Z`) - Date.parse(`${day.slice(0, 10)}T00:00:00Z`)) / 86_400_000
    if (after >= 0 && after <= REDO_DAYS && (nearest === null || after < nearest.after)) nearest = { other, after }
  }
  return nearest?.other ?? null
}

/**
 * The records around this one, newest first: up to three either side from
 * the two lists (newer and older than its day), this one kept in place even
 * when the lists missed it.
 */
export function aroundOf(purchase: DirectPurchase, newer: readonly DpOther[], older: readonly DpOther[], perSide = 3): readonly DpOther[] {
  const self: DpOther = { id: purchase.id, code: purchase.code, title: purchase.title, value: purchase.value, date: shownDayOf(purchase), done: isPurchase(purchase.outcome) }
  const byId = new Map<string, DpOther>()
  for (const other of [...newer, ...older]) byId.set(other.id, other)
  byId.set(self.id, self)
  const sorted = [...byId.values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.id.localeCompare(a.id))
  const at = sorted.findIndex((other) => other.id === self.id)
  return sorted.slice(Math.max(0, at - perSide), at + perSide + 1)
}
