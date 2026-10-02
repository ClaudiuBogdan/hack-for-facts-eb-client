import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import { buyerName } from './buyer-model'
import type { CtOffers } from './contract-model'
import { cpvKey, type DpLabel, type DpNames, type DpParty } from './direct-purchase-model'
import { toElicitatieClientUrl } from './elicitatie-client-url'
import { isUnpublishedProcedure, tidyName, tidyTitle } from './home-model'

/**
 * One procedure's page (`/procurement/procedures/$id`, `design.md` §22): the
 * call for competition and the award notice that closes it, whichever of the
 * two rows the page is opened on.
 *
 * What the API serves today (§22.1): the notice's row — an e-licitatie award
 * notice, or a row of SEAP's notice exports (a call, or a legacy notice) —
 * and at most 50 contract rows, one firm each, with no total. The award
 * notice as e-licitatie publishes it (`source`: the lots, their criteria, the
 * offers each received, every winner, the call it follows, every version) and
 * the notices tied to this one (`linked`) are not served yet (§22.2): the
 * live read leaves them empty, and the page shows those parts where they
 * arrive.
 *
 * Rules the page keeps whatever the read:
 * - Contracts SEAP links to the notice but another institution signed (the
 *   legacy join by a bare notice number) are never the procedure's: set
 *   apart, said, counted nowhere.
 * - An award notice's own estimate repeats the award: the estimate is the
 *   call's, the lots' or the contracts', over the lots awarded — never the
 *   award notice's.
 * - Call-offs („contracte subsecvente") the notice reports beside its
 *   frameworks never add to them.
 * - A zero is no value: SEAP writes 0.00 where it has none.
 * - A framework award notice's own value (e-licitatie's II.1.7, the API's
 *   `awardedValueRon`) is the call-offs awarded under it so far, not the
 *   frameworks' ceiling (checked on six notices, 2 October 2026): today's
 *   read says it as such.
 */

// ───────────────────────────────────────────────────────────── the read ──

export interface ProcedureParty {
  readonly cui: string | null
  readonly name: string | null
}

/** A `procurementProcedure` row: one notice. */
export interface ProcedureRow {
  readonly id: string
  readonly noticeNo: string | null
  readonly noticeKind: string | null
  readonly procedureType: string | null
  readonly title: string | null
  readonly authority: ProcedureParty
  readonly cpvCode: string | null
  readonly estimatedValueRon: string | null
  readonly awardedValueRon: string | null
  readonly status: string
  readonly publicationDate: string | null
  readonly sourceSystem: string
  readonly sourceUrl: string | null
  readonly valueAccepted: boolean
  /** The value engine's accepted amount, when it resolved one (a duplicate's rescue included). */
  readonly valueComparable?: string | null
}

/** A contract row as the API serves it: one firm's line, at its value. */
export interface ProcedureContractRow {
  readonly id: string
  readonly contractNo: string | null
  readonly contractDate: string | null
  readonly authority: ProcedureParty
  readonly supplier: ProcedureParty
  readonly valueRon: string | null
  readonly valueAccepted: boolean
  /** The value engine's accepted amount, when it resolved one. */
  readonly valueComparable?: string | null
  readonly recordKind: string | null
}

export interface ProcedureNoticeLot {
  readonly no: string
  readonly title: string | null
  readonly estimate: number | null
  /** „Cel mai bun raport calitate – pret", „Pretul cel mai scazut", … */
  readonly criterion: string | null
  readonly criteria: readonly { readonly name: string; readonly weight: number | null; readonly price: boolean }[]
  readonly months: number | null
  /** „Atribuit", „Anulat". */
  readonly status: string | null
}

/** A contract on the award notice: all its winners, its value, and the offers its lots received. */
export interface ProcedureNoticeContract {
  readonly id: string
  readonly no: string | null
  readonly date: string | null
  readonly lots: readonly string[]
  readonly value: number | null
  readonly currency: string | null
  readonly ronValue: number | null
  readonly winners: readonly { readonly name: string; readonly cui: string | null; readonly sme: boolean | null }[]
  /** The notice's word for the contract: „Contract de achizitii publice", „Acord-cadru", „Contract subsecvent". */
  readonly framework: string | null
  readonly estimate: number | null
  readonly offers: { readonly received: number | null; readonly sme: number | null; readonly eu: number | null; readonly nonEu: number | null } | null
  readonly lotOffers: readonly { readonly no: string; readonly admitted: number; readonly unaccepted: number; readonly nonconformed: number; readonly withdrawn: number }[]
}

/** The award notice as e-licitatie publishes it — not served yet (§22.2). */
export interface ProcedureNoticeSource {
  readonly caNoticeId: string
  readonly title: string | null
  /** „Lucrari", „Servicii", „Furnizare". */
  readonly contractType: string | null
  readonly legislation: string | null
  readonly procedureType: string | null
  readonly framework: boolean
  /** The call for competition the award follows, when it had one. */
  readonly call: { readonly no: string; readonly date: string | null } | null
  readonly ted: string | null
  /** Why there was no call (annex D), for a negotiation without one. */
  readonly annexD: { readonly explanation: string | null; readonly forceMajeure: boolean } | null
  readonly lots: readonly ProcedureNoticeLot[]
  readonly contracts: readonly ProcedureNoticeContract[]
  /** Every published version's day. */
  readonly versions: readonly { readonly date: string }[]
}

/** Another notice of the same institution this one is tied to: the call behind an award, its award, or the call a negotiation's reason names. */
export interface ProcedureLinkedNotice {
  readonly row: ProcedureRow
  readonly tie: 'call' | 'award' | 'named-in-reason' | 'names-in-reason'
}

/** What the page's read gives. */
export interface ProcedureRead {
  readonly procedure: ProcedureRow
  /** `procurementProcedure(id).contracts`: at most 50, no total. */
  readonly contracts: readonly ProcedureContractRow[]
  readonly ted: { readonly tedNoticeNo: string } | null
  readonly names: DpNames
  readonly source: ProcedureNoticeSource | null
  readonly linked: readonly ProcedureLinkedNotice[]
  /** For a call a negotiation's reason names: that reason. */
  readonly reason?: { readonly explanation: string | null } | null
}

/** The most rows `procurementProcedure` serves: a full page may hold more. */
export const PROCEDURE_CONTRACTS_CAP = 50

// ──────────────────────────────────────────────────────────── the sheet ──

/** What the page is about: an award notice, or a call no award is known for. */
export type PrKind = 'award' | 'call'

export type PrStatus = 'awarded' | 'cancelled' | 'suspended' | 'in_evaluation' | 'published' | 'unknown'

export interface PrFirm extends DpParty {
  readonly sme: boolean | null
}

export interface PrContract {
  readonly key: string
  readonly no: string | null
  readonly date: string | null
  /** Lei: the contract's value, or a framework's ceiling. */
  readonly value: number | null
  readonly firms: readonly PrFirm[]
  readonly lots: readonly string[]
  readonly framework: boolean
  /** Drawn on the procedure's frameworks: bought under them, never added to them. */
  readonly callOff: boolean
  /** The contract page this contract opens: one of its rows in the API. */
  readonly linkId: string | null
  /** From the API's rows: the values SEAP publishes the number at, when more than one. */
  readonly values: readonly number[]
  /** Its firms share one published value: an association's shape (a framework's firms each hold their own). */
  readonly sharedValue: boolean
}

export interface PrLot {
  readonly no: string
  readonly title: string | null
  readonly estimate: number | null
  readonly status: 'awarded' | 'cancelled' | null
  readonly criterion: string | null
  readonly criteria: ProcedureNoticeLot['criteria']
  readonly months: number | null
  readonly offers: CtOffers | null
  readonly contracts: readonly PrContract[]
  /** Lei awarded on the lot; null when cancelled or unvalued. */
  readonly value: number | null
}

export interface PrNoticeRef {
  readonly no: string
  readonly id: string | null
  readonly date: string | null
  readonly status: PrStatus | null
  readonly estimate: number | null
}

export interface ProcedureSheet {
  readonly id: string
  readonly kind: PrKind
  /** The row the page was opened on is the call's, and the page tells the whole procedure from it. */
  readonly openedOnCall: boolean
  readonly noticeNo: string | null
  readonly title: string | null
  readonly authority: DpParty
  /** SEAP's word, „Licitatie deschisa": `procedureLabel` says it. */
  readonly procedureType: string | null
  readonly unpublished: boolean
  readonly contractType: 'works' | 'services' | 'supplies' | null
  /** „Legea 98/2016". */
  readonly legislation: string | null
  readonly framework: boolean
  readonly cpv: { readonly code: string; readonly label: DpLabel | null } | null
  readonly status: PrStatus
  /** What the institution estimated for what was awarded (for a call, for all of it). */
  readonly estimate: number | null
  /** Lei awarded; a framework's ceiling. */
  readonly awarded: number | null
  /** The award is the contracts' sum (the notice's contracts, or rows that add up to it): said as theirs. */
  readonly awardedByContracts: boolean
  /** Today's read of an e-licitatie framework notice: the call-offs the notice reports, its only value. */
  readonly callOffsReported: number | null
  readonly call: PrNoticeRef | null
  readonly award: PrNoticeRef | null
  /** The award notice's publications, oldest first. */
  readonly awardNotice: { readonly first: string; readonly last: string; readonly republished: number } | null
  /** None when the API's rows came back full: their days are a part's. */
  readonly contractsSpan: { readonly from: string; readonly to: string } | null
  readonly lots: readonly PrLot[]
  readonly lotsCancelled: number
  readonly offers: { readonly received: number; readonly lots: number; readonly single: number } | null
  readonly contracts: readonly PrContract[]
  readonly callOffs: readonly PrContract[]
  /** The contracts are the API's rows (one firm each), not the notice's. */
  readonly fromRows: boolean
  /** The API's 50 rows came back full: there may be more. */
  readonly contractsCapped: boolean
  /** Rows SEAP links here that another institution signed. */
  readonly foreign: readonly {
    readonly id: string
    readonly no: string | null
    readonly date: string | null
    readonly authority: DpParty
    readonly supplier: DpParty
    readonly value: number | null
    /** False: SEAP names no institution for the row, and its number is not one that ties it for sure. */
    readonly verified: boolean
  }[]
  readonly firmsCount: number
  readonly ted: { readonly no: string; readonly url: string } | null
  /** A negotiation without a call: the institution's reason, and the notice it names. */
  readonly reason: { readonly text: string | null; readonly urgency: boolean; readonly names: PrNoticeRef | null } | null
  /** A call a later negotiation's reason names. */
  readonly namedBy: { readonly notice: PrNoticeRef; readonly text: string | null; readonly awarded: number | null } | null
  /** The values are the award notice's, which states them without VAT; the API's rows state no basis. */
  readonly vatExcluded: boolean
  readonly source: { readonly kind: 'notice'; readonly url: string | null } | { readonly kind: 'export'; readonly url: string | null; readonly file: string | null }
  /** The year the parties' pages open on. */
  readonly year: number | undefined
  /** The names could not be read: the record's own stand. */
  readonly partial: boolean
}

// ─────────────────────────────────────────────────────────────── helpers ──

/** Lei, or nothing: SEAP writes 0.00 where it has no value. */
const lei = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const STATUSES = new Set<PrStatus>(['awarded', 'cancelled', 'suspended', 'in_evaluation', 'published', 'unknown'])
const statusOf = (status: string): PrStatus => (STATUSES.has(status as PrStatus) ? (status as PrStatus) : 'unknown')

/**
 * An award notice's state: cancelled or suspended as SEAP says; awarded
 * otherwise — an award notice is the award, whatever stage its row's state
 * names (e-licitatie's „in evaluation" on an award notice).
 */
const awardStatusOf = (status: string): PrStatus => {
  const read = statusOf(status)
  return read === 'cancelled' || read === 'suspended' ? read : 'awarded'
}

/**
 * An award notice's row: SEAP's „award" kinds, or an e-licitatie award
 * number (CAN…, SCNA…). Every other row — a call (CN…, SCN…), a dynamic
 * purchasing system's invitation (`sad`), a legacy notice — tells what was
 * asked, not what was awarded.
 */
export const isAwardRow = (row: Pick<ProcedureRow, 'noticeKind' | 'noticeNo'>): boolean => row.noticeKind === 'award' || row.noticeKind === 'award_no_init' || /^(?:S?CAN|SCNA)\d/u.test(row.noticeNo ?? '')

/** A name as two spellings of it compare: no diacritics, no case, no punctuation. */
const nameKey = (name: string | null): string => (name ?? '').replace(/\./gu, '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('ro-RO').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/**
 * A contract row against the notice's institution: the same when the CUIs
 * (both known) or, a CUI missing, the names agree; other when they certainly
 * differ; unknown when there is nothing to compare.
 */
const institutionMatch = (a: ProcedureParty, b: ProcedureParty): 'same' | 'other' | 'unknown' => {
  if (a.cui && b.cui) return a.cui === b.cui ? 'same' : 'other'
  const x = nameKey(a.name)
  const y = nameKey(b.name)
  if (!x || !y) return 'unknown'
  return x === y ? 'same' : 'other'
}

/** A firm's identity across rows: its CUI, or the CUI another row gives the same name, or the name. */
function firmKeys(parties: readonly ProcedureParty[]): (party: ProcedureParty) => string {
  const cuiByName = new Map<string, string>()
  for (const party of parties) if (party.cui && nameKey(party.name)) cuiByName.set(nameKey(party.name), party.cui)
  return (party) => party.cui ?? cuiByName.get(nameKey(party.name)) ?? `name:${nameKey(party.name)}`
}

/** The notice's value and its contracts' agree, but for their rounding to whole lei (a leu a contract): the value is theirs to carry. */
const agrees = (total: number | null, value: number | null, contracts: number): boolean => total !== null && value !== null && Math.abs(total - value) <= Math.max(1, contracts)

const numberOrder = (a: string, b: string) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b)

/** A sum only when every part is known. */
const sum = (values: readonly (number | null)[]): number | null => (values.length === 0 || values.some((value) => value === null) ? null : values.reduce<number>((total, value) => total + (value ?? 0), 0))

/** „LOT III - …", „LOT I…": the lot's number, said again in its title. */
const LOT_PREFIX = /^\s*[Ll][Oo][Tt](?:ul)?\s+(?:nr\.?\s*)?(?:[IVXLC]+|\d+)(?=[\s\-–.:]|[A-ZĂÂÎȘȚ][a-zăâîșț])\s*[-–.:]?\s*/u

/** A framework by its title — „Acord-cadru …" — unless it is a call-off naming its framework. */
const FRAMEWORK_TITLE = /acord(?:ul|ului|uri|urile|urilor)?[\s-]*cadru/iu
const CALL_OFF_TITLE = /subsecvent/iu

const CONTRACT_TYPES: Readonly<Record<string, ProcedureSheet['contractType']>> = { lucrari: 'works', servicii: 'services', furnizare: 'supplies', produse: 'supplies' }

/** „Legea nr. 98/23.05.2016" → „Legea 98/2016". */
const lawOf = (text: string | null): string | null => {
  const match = text?.match(/Legea\s+nr\.\s*(\d+)\/\d{2}\.\d{2}\.(\d{4})/u)
  return match ? `Legea ${match[1]}/${match[2]}` : text
}

const fileOf = (url: string | null): string | null => {
  const last = url?.split('/').pop()
  if (!last) return null
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

const tedUrl = (no: string) => `https://ted.europa.eu/ro/notice/-/detail/${no}`

/** The award notice's page on e-licitatie (the API's `api-pub` address answers JSON). */
const noticePage = (caNoticeId: string) => `https://e-licitatie.ro/pub/notices/ca-notices/view-c/${caNoticeId}`

/** Names as the page says them: the institution's from the budget platform or SEAP's labels, a firm's as the company pages do. */
function namerOf(names: DpNames, ownAuthorityCui: string | null) {
  const label = (cui: string | null) => (cui ? names.labels.get(cui) : undefined)
  const institution = (party: ProcedureParty): DpParty => {
    if (party.cui === ownAuthorityCui && names.authority) return { cui: party.cui, name: names.authority.name, identity: names.authority.identity, hasBudget: names.authority.hasBudget }
    return { cui: party.cui, name: buyerName(tidyName(label(party.cui) ?? party.name ?? party.cui ?? '—'), null, false), identity: null, hasBudget: false }
  }
  const firm = (party: ProcedureParty): DpParty => ({ cui: party.cui, name: displayCompanyName(label(party.cui) ?? party.name ?? party.cui ?? '—'), identity: null, hasBudget: false })
  const cpv = (code: string | null) => {
    const key = cpvKey(code)
    return key ? { code: key, label: names.cpv.get(key) ?? null } : null
  }
  return { institution, firm, cpv }
}

const refOf = (row: ProcedureRow): PrNoticeRef => ({
  no: row.noticeNo ?? row.id,
  id: row.id,
  date: row.publicationDate,
  status: isAwardRow(row) ? awardStatusOf(row.status) : statusOf(row.status),
  estimate: isAwardRow(row) ? null : lei(row.estimatedValueRon),
})

// ──────────────────────────────────────────────────────────── contracts ──

/** The API row a notice contract opens: the same number, one of its winners; else the number alone. */
function linkOf(contract: ProcedureNoticeContract, rows: readonly ProcedureContractRow[]): string | null {
  const same = rows.filter((row) => row.contractNo !== null && row.contractNo === contract.no)
  const cuis = new Set(contract.winners.map((winner) => winner.cui).filter(Boolean))
  const byFirm = same.filter((row) => row.supplier.cui && cuis.has(row.supplier.cui))
  const pick = [...byFirm, ...same].sort((a, b) => Number(b.valueAccepted) - Number(a.valueAccepted))[0]
  return pick?.id ?? null
}

function noticeContractOf(contract: ProcedureNoticeContract, rows: readonly ProcedureContractRow[], firm: (party: ProcedureParty) => DpParty): PrContract {
  return {
    key: contract.id,
    no: contract.no,
    date: contract.date,
    value: lei(contract.ronValue ?? (contract.currency && /^(RON|Leu)/iu.test(contract.currency) ? contract.value : null)),
    firms: contract.winners.map((winner) => ({ ...firm({ cui: winner.cui, name: winner.name }), sme: winner.sme })),
    lots: contract.lots,
    framework: contract.framework === 'Acord-cadru',
    callOff: contract.framework === 'Contract subsecvent',
    linkId: linkOf(contract, rows),
    values: [],
    // One contract on the notice, its winners together: an association when not a framework.
    sharedValue: true,
  }
}

/** The API's own-institution rows, one per firm, gathered by number: an association's members, a number's several values. */
/** A row's accepted value: the value engine's when it resolved one, else the row's own. */
const rowValue = (row: ProcedureContractRow): number | null => (row.valueAccepted ? (lei(row.valueComparable) ?? lei(row.valueRon)) : null)

function rowContractsOf(rows: readonly ProcedureContractRow[], firm: (party: ProcedureParty) => DpParty, firmKey: (party: ProcedureParty) => string): PrContract[] {
  const byNumber = new Map<string, ProcedureContractRow[]>()
  for (const row of rows) {
    const key = row.contractNo ?? `id:${row.id}`
    byNumber.set(key, [...(byNumber.get(key) ?? []), row])
  }
  return [...byNumber.values()].map((group) => {
    const first = group[0]!
    const firms = new Map<string, PrFirm>()
    for (const row of group) {
      const key = firmKey(row.supplier)
      // A firm met first without its CUI takes the CUI another row gives it.
      if (!firms.has(key) || (!firms.get(key)!.cui && row.supplier.cui)) firms.set(key, { ...firm(row.supplier), sme: null })
    }
    const values = [...new Set(group.map(rowValue).filter((value): value is number => value !== null))]
    const published = new Set(group.map((row) => lei(row.valueRon) ?? lei(row.valueComparable)))
    const dates = group.map((row) => row.contractDate).filter((date): date is string => Boolean(date)).sort()
    return {
      key: first.id,
      no: first.contractNo,
      date: dates[dates.length - 1] ?? null,
      value: values.length === 1 ? values[0]! : null,
      firms: [...firms.values()],
      lots: [],
      framework: group.some((row) => row.recordKind === 'framework_agreement'),
      callOff: false,
      linkId: group.find((row) => row.valueAccepted)?.id ?? first.id,
      values,
      sharedValue: published.size === 1 && !published.has(null),
    }
  })
}

// ───────────────────────────────────────────────────────────────── lots ──

function lotOf(lot: ProcedureNoticeLot, contracts: readonly PrContract[], notice: readonly ProcedureNoticeContract[]): PrLot {
  const own = contracts.filter((contract) => contract.lots.includes(lot.no))
  const raws = notice.filter((contract) => contract.framework !== 'Contract subsecvent' && contract.lots.includes(lot.no))
  const lotOffers = raws.flatMap((contract) => contract.lotOffers.filter((entry) => entry.no === lot.no))[0] ?? null
  // A contract on this lot alone says the lot's offers whole (received, from SMEs, from abroad); one on several lots says only the lot's fates.
  const whole = raws.find((contract) => contract.lots.length === 1 && contract.offers?.received != null)
  const offers: CtOffers | null = lotOffers
    ? {
        received: whole?.offers?.received ?? lotOffers.admitted + lotOffers.unaccepted + lotOffers.nonconformed,
        admitted: lotOffers.admitted,
        unaccepted: lotOffers.unaccepted,
        nonconformed: lotOffers.nonconformed,
        withdrawn: lotOffers.withdrawn,
        sme: whole?.offers?.sme ?? null,
        eu: whole?.offers?.eu ?? null,
        nonEu: whole?.offers?.nonEu ?? null,
      }
    : null
  const status = lot.status === 'Anulat' ? 'cancelled' : lot.status === 'Atribuit' || own.length > 0 ? 'awarded' : null
  return {
    no: lot.no,
    title: lot.title && !/^lot implicit$/iu.test(lot.title.trim()) ? tidyTitle(lot.title.replace(LOT_PREFIX, '')) : null,
    estimate: lei(lot.estimate) ?? sum(raws.map((contract) => lei(contract.estimate))),
    status,
    criterion: lot.criterion,
    criteria: lot.criteria,
    months: lot.months,
    offers,
    contracts: own,
    value: status === 'cancelled' ? null : sum(own.map((contract) => contract.value)),
  }
}

// ──────────────────────────────────────────────────────────────── sheet ──

export function procedureSheetOf(read: ProcedureRead): ProcedureSheet {
  const row = read.procedure
  const { institution, firm, cpv } = namerOf(read.names, row.authority.cui)
  // A row SEAP names no institution for is the notice's when its number ties it for sure (an e-licitatie award number is unique);
  // a legacy number repeats across institutions, so there it is set apart, unverified.
  const uniqueNumber = /^(?:S?CAN|SCNA)\d/u.test(row.noticeNo ?? '')
  const match = (contract: ProcedureContractRow) => institutionMatch(row.authority, contract.authority)
  const own = (contract: ProcedureContractRow) => match(contract) === 'same' || (match(contract) === 'unknown' && uniqueNumber)
  const ownRows = read.contracts.filter(own)
  const foreign = read.contracts.filter((contract) => !own(contract))
  const firmKey = firmKeys([...ownRows.map((contract) => contract.supplier), ...(read.source?.contracts ?? []).flatMap((contract) => contract.winners)])
  const linked = (tie: ProcedureLinkedNotice['tie']) => read.linked.find((link) => link.tie === tie)?.row ?? null
  const source = read.source
  const openedOnCall = !isAwardRow(row)
  // A call's row tells the award only when the award is tied to it.
  const awardRow = openedOnCall ? linked('award') : row
  const callRow = openedOnCall ? row : linked('call')
  const kind: PrKind = awardRow ? 'award' : 'call'

  const noticeContracts = source?.contracts ?? []
  const every = source ? noticeContracts.map((contract) => noticeContractOf(contract, ownRows, firm)) : rowContractsOf(ownRows, firm, firmKey)
  const contracts = every.filter((contract) => !contract.callOff)
  const callOffs = every.filter((contract) => contract.callOff)
  const lots = source ? [...source.lots].sort((a, b) => numberOrder(a.no, b.no)).map((lot) => lotOf(lot, contracts, noticeContracts)) : []
  const awardedLots = lots.filter((lot) => lot.status === 'awarded')

  const procedureType = source?.procedureType ?? awardRow?.procedureType ?? row.procedureType
  const callEstimate = callRow ? lei(callRow.estimatedValueRon) : null
  const awardedEstimate = awardedLots.length > 0 ? sum(awardedLots.map((lot) => lot.estimate)) : null
  const estimate = kind === 'call' ? callEstimate : (awardedEstimate ?? (lots.length === 0 ? callEstimate : null))
  // A framework by its rows or its title — never a call-off naming its framework, whatever its rows are filed as (§22.2 item 8).
  const title = awardRow?.title ?? row.title
  const callOffTitled = title !== null && CALL_OFF_TITLE.test(title)
  const framework = source?.framework ?? (!callOffTitled && (contracts.some((contract) => contract.framework) || (title !== null && FRAMEWORK_TITLE.test(title))))
  const noticeValue = awardRow?.valueAccepted ? (lei(awardRow.valueComparable) ?? lei(awardRow.awardedValueRon)) : null
  // A framework notice's own value is its call-offs' (checked on e-licitatie's notices only): the ceiling is the frameworks' sum, served only with the notice.
  const awarded = kind === 'call' ? null : source ? sum(contracts.map((contract) => contract.value)) : framework ? null : noticeValue
  const callOffsReported = kind === 'award' && source === null && framework && awardRow?.sourceSystem === 'elicitatie' ? noticeValue : null
  const capped = source === null && read.contracts.length >= PROCEDURE_CONTRACTS_CAP
  // The notice's value is its contracts' only when they add up to it; a part linked, or a value missing, leaves it the notice's alone.
  const awardedByContracts = source !== null || (!capped && agrees(sum(contracts.map((contract) => contract.value)), awarded, contracts.length))

  const versions = source ? source.versions.map((version) => version.date.slice(0, 10)).sort() : []
  const dates = contracts.map((contract) => contract.date).filter((date): date is string => Boolean(date)).sort()
  const offered = awardedLots.map((lot) => lot.offers).filter((offers): offers is CtOffers => offers !== null)
  const firms = new Set(contracts.flatMap((contract) => contract.firms.map(firmKey)))
  const tedNo = read.ted?.tedNoticeNo ?? source?.ted ?? null
  const named = linked('named-in-reason')
  const namedBy = linked('names-in-reason')
  const firstDay = dates[0] ?? callRow?.publicationDate ?? null
  const sourceUrl = row.sourceUrl ? toElicitatieClientUrl(row.sourceUrl) : null

  return {
    id: row.id,
    kind,
    openedOnCall,
    noticeNo: awardRow?.noticeNo ?? row.noticeNo,
    title: tidyTitle(source?.title ?? awardRow?.title ?? callRow?.title ?? row.title),
    authority: institution(row.authority),
    procedureType,
    unpublished: procedureType ? isUnpublishedProcedure(procedureType) : false,
    contractType: source?.contractType ? (CONTRACT_TYPES[source.contractType.trim().toLowerCase()] ?? null) : null,
    legislation: lawOf(source?.legislation ?? null),
    framework,
    cpv: cpv(row.cpvCode ?? awardRow?.cpvCode ?? null),
    status: awardRow ? awardStatusOf(awardRow.status) : statusOf(row.status),
    estimate,
    awarded,
    awardedByContracts,
    callOffsReported,
    call: source?.call
      ? { no: source.call.no, id: callRow?.id ?? null, date: source.call.date ?? callRow?.publicationDate ?? null, status: callRow ? statusOf(callRow.status) : null, estimate: callEstimate }
      : callRow
        ? refOf(callRow)
        : null,
    award: openedOnCall && awardRow ? refOf(awardRow) : null,
    awardNotice: versions.length > 0 ? { first: versions[0]!, last: versions[versions.length - 1]!, republished: versions.length - 1 } : null,
    contractsSpan: dates.length > 0 && dates.length === contracts.length && !capped ? { from: dates[0]!, to: dates[dates.length - 1]! } : null,
    lots,
    lotsCancelled: lots.filter((lot) => lot.status === 'cancelled').length,
    offers: offered.length > 0 ? { received: offered.reduce((total, offer) => total + offer.received, 0), lots: offered.length, single: offered.filter((offer) => offer.received === 1).length } : null,
    contracts: [...contracts].sort((a, b) => numberOrder(a.lots[0] ?? '', b.lots[0] ?? '') || (a.date ?? '').localeCompare(b.date ?? '')),
    callOffs: [...callOffs].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
    fromRows: source === null,
    contractsCapped: capped,
    foreign: foreign.map((contract) => ({
      id: contract.id,
      no: contract.contractNo,
      date: contract.contractDate,
      authority: institution(contract.authority),
      supplier: firm(contract.supplier),
      value: rowValue(contract),
      verified: match(contract) === 'other',
    })),
    firmsCount: firms.size,
    ted: tedNo ? { no: tedNo, url: tedUrl(tedNo) } : null,
    reason: source?.annexD ? { text: source.annexD.explanation, urgency: source.annexD.forceMajeure, names: named ? refOf(named) : null } : null,
    namedBy: namedBy ? { notice: refOf(namedBy), text: read.reason?.explanation ?? null, awarded: namedBy.valueAccepted ? lei(namedBy.awardedValueRon) : null } : null,
    vatExcluded: source !== null,
    source: source
      ? { kind: 'notice', url: noticePage(source.caNoticeId) }
      : row.sourceSystem === 'elicitatie'
        ? { kind: 'notice', url: sourceUrl }
        : { kind: 'export', url: row.sourceUrl, file: fileOf(row.sourceUrl) },
    year: firstDay ? Number(firstDay.slice(0, 4)) : undefined,
    partial: read.names.failed,
  }
}
