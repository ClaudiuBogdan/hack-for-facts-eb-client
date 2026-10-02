import type { CtOffers } from '@/features/procurement/lib/contract-model'
import type { DpLabel, DpParty } from '@/features/procurement/lib/direct-purchase-model'
import { isUnpublishedProcedure, tidyName, tidyTitle } from '@/features/procurement/lib/home-model'
import type { RawNoticeContract, RawNoticeLot, RawProcedureContract, RawProcedureRecord, RawProcedureRow } from './procedure.types'

/**
 * The procedure page's record (`design.md` §22): one procedure — the call
 * for competition and the award notice that closes it — whichever of the two
 * rows the page is opened on. Two reads of the same record:
 *
 * - `target` reads the award notice as e-licitatie publishes it (the lots,
 *   the offers, every winner, the call behind it, the versions): what the API
 *   must serve for this page.
 * - `today` reads only what `procurementProcedure` answers now: the notice's
 *   row and at most 50 contract rows, one firm each.
 *
 * Contracts SEAP links to the notice but signed by another institution (the
 * legacy join by a bare notice number) are never the procedure's: they are
 * set apart, said, and counted nowhere.
 */

export type PsRead = 'target' | 'today'

/** What the page is about: an award (contracts signed), or a call no award is known for. */
export type PsKind = 'award' | 'call'

export type PsStatus = 'awarded' | 'cancelled' | 'suspended' | 'in_evaluation' | 'published' | 'unknown'

export interface PsFirm extends DpParty {
  readonly sme: boolean | null
}

export interface PsContract {
  readonly key: string
  readonly no: string | null
  readonly date: string | null
  /** Lei: the contract's value, or a framework's ceiling. */
  readonly value: number | null
  readonly currency: string | null
  readonly firms: readonly PsFirm[]
  readonly lots: readonly string[]
  readonly framework: boolean
  /** A contract drawn on the procedure's frameworks („contract subsecvent"): bought under them, never added to them. */
  readonly callOff: boolean
  readonly estimate: number | null
  readonly modified: number
  /** The contract page this contract opens: one of its rows in the API. */
  readonly linkId: string | null
  /** Today's read: the values SEAP publishes the number at, when more than one. */
  readonly values: readonly number[]
}

export interface PsLot {
  readonly no: string
  readonly title: string | null
  readonly estimate: number | null
  readonly status: 'awarded' | 'cancelled' | null
  readonly criterion: string | null
  readonly criteria: readonly { readonly name: string; readonly weight: number | null; readonly price: boolean }[]
  readonly months: number | null
  readonly offers: CtOffers | null
  /** The offers' range, a framework's: the lowest and highest price offered. */
  readonly spread: { readonly lowest: number; readonly highest: number } | null
  readonly contracts: readonly PsContract[]
  /** Lei awarded on the lot; null when cancelled or unvalued. */
  readonly value: number | null
}

export interface PsNoticeRef {
  readonly no: string
  readonly id: string | null
  readonly date: string | null
  readonly status: PsStatus | null
  readonly estimate: number | null
}

export interface ProcedureSheet {
  readonly read: PsRead
  /** The values are the award notice's, which states them without VAT; an export row states no basis. */
  readonly vatExcluded: boolean
  readonly id: string
  readonly kind: PsKind
  /** The row the page was opened on is the call's, and the page tells the whole procedure from it. */
  readonly openedOnCall: boolean
  readonly noticeNo: string | null
  readonly title: string | null
  readonly authority: DpParty
  /** SEAP's word, „Licitatie deschisa": `procedureLabel` says it. */
  readonly procedureType: string | null
  readonly unpublished: boolean
  /** „Lucrări", „Servicii", „Produse". */
  readonly contractType: 'works' | 'services' | 'supplies' | null
  readonly legislation: string | null
  readonly framework: boolean
  readonly cpv: { readonly code: string; readonly label: DpLabel | null } | null
  readonly status: PsStatus
  /** What the institution estimated for what was awarded (or, for a call, for all of it). */
  readonly estimate: number | null
  readonly awarded: number | null
  readonly call: PsNoticeRef | null
  readonly award: PsNoticeRef | null
  /** The award notice's publications, oldest first. */
  readonly awardNotice: { readonly first: string; readonly last: string; readonly republished: number } | null
  readonly contractsSpan: { readonly from: string; readonly to: string } | null
  readonly lots: readonly PsLot[]
  readonly lotsTotal: number
  readonly lotsCancelled: number
  readonly offers: { readonly received: number; readonly lots: number; readonly single: number } | null
  readonly contracts: readonly PsContract[]
  /** Contracts the notice reports as drawn on its frameworks: what was bought under them so far. */
  readonly callOffs: readonly PsContract[]
  /** Today's read: the API's 50 came back full, so there may be more. */
  readonly contractsCapped: boolean
  /** Rows SEAP links here that another institution signed. */
  readonly foreign: readonly { readonly id: string; readonly no: string | null; readonly date: string | null; readonly authority: DpParty; readonly supplier: DpParty; readonly value: number | null }[]
  readonly firmsCount: number
  readonly ted: { readonly no: string; readonly url: string } | null
  /** A negotiation without a call: the institution's reason, and the notice it names. */
  readonly reason: { readonly text: string | null; readonly urgency: boolean; readonly names: PsNoticeRef | null } | null
  /** A call a later negotiation's reason names. */
  readonly namedBy: { readonly notice: PsNoticeRef; readonly text: string | null; readonly awarded: number | null } | null
  readonly source: { readonly kind: 'notice'; readonly url: string } | { readonly kind: 'export'; readonly url: string | null; readonly file: string | null }
  /** The year the parties' pages open on. */
  readonly year: number | undefined
}

// ───────────────────────────────────────────────────────────── helpers ──

const decimal = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const STATUSES = new Set<PsStatus>(['awarded', 'cancelled', 'suspended', 'in_evaluation', 'published', 'unknown'])
const statusOf = (status: string): PsStatus => (STATUSES.has(status as PsStatus) ? (status as PsStatus) : 'unknown')

const isCallRow = (row: RawProcedureRow): boolean => row.noticeKind === 'initiation' || /^S?CN\d/u.test(row.noticeNo ?? '')

/** „LOT III - …", „LOT I…": the lot's number, said again in its title. */
const LOT_PREFIX = /^\s*[Ll][Oo][Tt](?:ul)?\s+(?:nr\.?\s*)?(?:[IVXLC]+|\d+)(?=[\s\-–.:]|[A-ZĂÂÎȘȚ][a-zăâîșț])\s*[-–.:]?\s*/u

const numberOrder = (a: string, b: string) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b)

const sum = (values: readonly (number | null)[]): number | null => (values.length === 0 || values.some((value) => value === null) ? null : values.reduce<number>((total, value) => total + (value ?? 0), 0))

function namer(raw: RawProcedureRecord) {
  const labels = new Map(raw.names.labels)
  const cpv = new Map(raw.names.cpv.map((code) => [code.code, { ro: code.ro, en: code.en }]))
  const party = (cui: string | null, name: string | null): DpParty => ({ cui, name: tidyName((cui ? labels.get(cui) : undefined) ?? name ?? ''), identity: null, hasBudget: false })
  return { party, cpv: (code: string | null) => (code ? { code, label: cpv.get(code) ?? null } : null) }
}

const refOf = (row: RawProcedureRow): PsNoticeRef => ({ no: row.noticeNo ?? row.id, id: row.id, date: row.publicationDate, status: statusOf(row.status), estimate: decimal(row.estimatedValueRon) })

const CONTRACT_TYPES: Record<string, ProcedureSheet['contractType']> = { lucrari: 'works', servicii: 'services', furnizare: 'supplies', produse: 'supplies' }

/** „Legea nr. 98/23.05.2016" → „Legea 98/2016". */
const lawOf = (text: string | null): string | null => {
  const match = text?.match(/Legea\s+nr\.\s*(\d+)\/\d{2}\.\d{2}\.(\d{4})/u)
  return match ? `Legea ${match[1]}/${match[2]}` : (text ?? null)
}

const fileOf = (url: string | null): string | null => (url ? (decodeURIComponent(url.split('/').pop() ?? '') || null) : null)

/** The award notice's human page on e-licitatie (the api answers JSON). */
const noticePage = (caNoticeId: string) => `https://e-licitatie.ro/pub/notices/ca-notices/view-c/${caNoticeId}`

// ─────────────────────────────────────────────────────────── contracts ──

/** The API row a notice contract opens: same number, one of its winners; else the number alone. */
function linkOf(contract: RawNoticeContract, rows: readonly RawProcedureContract[]): string | null {
  const same = rows.filter((row) => row.contractNo === contract.no)
  const cuis = new Set(contract.winners.map((winner) => winner.cui).filter(Boolean))
  const byFirm = same.filter((row) => row.supplier.cui && cuis.has(row.supplier.cui))
  const pick = [...byFirm, ...same].sort((a, b) => Number(b.valueAccepted) - Number(a.valueAccepted))[0]
  return pick?.id ?? null
}

function noticeContractOf(contract: RawNoticeContract, rows: readonly RawProcedureContract[], party: ReturnType<typeof namer>['party']): PsContract {
  return {
    key: contract.id,
    no: contract.no,
    date: contract.date,
    value: contract.ronValue ?? (contract.currency === 'RON' ? contract.value : null),
    currency: contract.currency,
    firms: contract.winners.map((winner) => ({ ...party(winner.cui, winner.name), sme: winner.sme })),
    lots: contract.lots,
    framework: contract.framework === 'Acord-cadru',
    callOff: contract.framework === 'Contract subsecvent',
    estimate: contract.estimate,
    modified: contract.modified,
    linkId: linkOf(contract, rows),
    values: [],
  }
}

/** Today's contracts: the API's own-institution rows, one per firm, gathered by number — an association's members, a number's values. */
function rowContractsOf(rows: readonly RawProcedureContract[], party: ReturnType<typeof namer>['party']): PsContract[] {
  const byNumber = new Map<string, RawProcedureContract[]>()
  for (const row of rows) {
    const key = row.contractNo ?? `id:${row.id}`
    byNumber.set(key, [...(byNumber.get(key) ?? []), row])
  }
  return [...byNumber.values()].map((group) => {
    const first = group[0]!
    const firms = new Map<string, PsFirm>()
    for (const row of group) {
      const key = row.supplier.cui ?? row.supplier.name ?? row.id
      if (!firms.has(key)) firms.set(key, { ...party(row.supplier.cui, row.supplier.name), sme: null })
    }
    const values = [...new Set(group.map((row) => decimal(row.valueRon)).filter((value): value is number => value !== null))]
    return {
      key: first.id,
      no: first.contractNo,
      date: group.map((row) => row.contractDate).filter(Boolean).sort().slice(-1)[0] ?? null,
      value: values.length === 1 ? values[0]! : null,
      currency: 'RON',
      firms: [...firms.values()],
      lots: [],
      framework: first.recordKind === 'framework_agreement',
      callOff: false,
      estimate: null,
      modified: 0,
      linkId: group.find((row) => row.valueAccepted)?.id ?? first.id,
      values,
    }
  })
}

// ──────────────────────────────────────────────────────────────── lots ──

function lotOf(lot: RawNoticeLot, contracts: readonly PsContract[], notice: readonly RawNoticeContract[]): PsLot {
  const own = contracts.filter((contract) => !contract.callOff && contract.lots.includes(lot.no))
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
  const spreadOf = raws.find((contract) => contract.lowest !== null && contract.highest !== null)
  const status = lot.status === 'Anulat' ? 'cancelled' : lot.status === 'Atribuit' ? 'awarded' : own.length > 0 ? 'awarded' : null
  const estimate = lot.estimate ?? sum(raws.map((contract) => contract.estimate))
  return {
    no: lot.no,
    title: lot.title && !/^lot implicit$/iu.test(lot.title.trim()) ? tidyTitle(lot.title.replace(LOT_PREFIX, '')) : null,
    estimate: estimate && estimate > 0 ? estimate : null,
    status,
    criterion: lot.criterion,
    criteria: lot.criteria,
    months: lot.months,
    offers,
    spread: spreadOf ? { lowest: spreadOf.lowest!, highest: spreadOf.highest! } : null,
    contracts: own,
    value: status === 'cancelled' ? null : sum(own.map((contract) => contract.value)),
  }
}

// ─────────────────────────────────────────────────────────────── sheet ──

export function procedureSheetOf(raw: RawProcedureRecord, read: PsRead): ProcedureSheet {
  const { party, cpv } = namer(raw)
  const row = raw.procedure
  const authority = party(row.authority.cui, row.authority.name)
  const own = (contract: RawProcedureContract) => contract.authority.cui === row.authority.cui
  const apiRows = [...raw.contracts, ...(raw.notice ?? [])]
  const ownRows = raw.contracts.filter(own)
  const foreign = raw.contracts.filter((contract) => !own(contract))
  const linkedCall = raw.linked.find((link) => link.tie === 'call')?.row ?? null
  const linkedAward = raw.linked.find((link) => link.tie === 'award')?.row ?? null
  const named = raw.linked.find((link) => link.tie === 'named-in-reason')?.row ?? null
  const namedBy = raw.linked.find((link) => link.tie === 'names-in-reason')?.row ?? null
  const source = read === 'target' ? raw.source : null
  const openedOnCall = isCallRow(row)
  // Today a call's row knows nothing of its award; the target ties them (the award notice names its call).
  const awardRow = openedOnCall ? (read === 'target' ? linkedAward : null) : row
  const callRow = openedOnCall ? row : read === 'target' ? linkedCall : null
  const kind: PsKind = awardRow ? 'award' : 'call'

  const noticeContracts = source?.contracts ?? []
  const everyContract = source ? noticeContracts.map((contract) => noticeContractOf(contract, apiRows, party)) : rowContractsOf(ownRows, party)
  const contracts = everyContract.filter((contract) => !contract.callOff)
  const callOffs = everyContract.filter((contract) => contract.callOff)
  const lots = source ? [...source.lots].sort((a, b) => numberOrder(a.no, b.no)).map((lot) => lotOf(lot, contracts, noticeContracts)) : []
  const awardedLots = lots.filter((lot) => lot.status === 'awarded')

  const procedureType = source?.procedureType ?? awardRow?.procedureType ?? row.procedureType
  const framework = source?.framework ?? contracts.some((contract) => contract.framework)

  // The award notice's own estimate repeats the award: the institution's estimate is the call's, the lots', or the contracts'.
  const callEstimate = callRow ? decimal(callRow.estimatedValueRon) : null
  const awardedEstimate = awardedLots.length > 0 ? sum(awardedLots.map((lot) => lot.estimate)) : null
  const estimate = kind === 'call' ? (callEstimate ?? (openedOnCall ? decimal(row.estimatedValueRon) : null)) : (awardedEstimate ?? (lots.length === 0 ? callEstimate : null))

  const awarded = source
    ? sum(contracts.map((contract) => contract.value))
    : kind === 'award' && row.valueAccepted
      ? decimal(row.awardedValueRon)
      : null

  const versions = source ? [...source.versions].map((version) => version.date.slice(0, 10)).sort() : []
  const dates = contracts.map((contract) => contract.date).filter((date): date is string => Boolean(date)).sort()

  const offered = awardedLots.map((lot) => lot.offers).filter((offers): offers is CtOffers => offers !== null)
  const offers = offered.length > 0 ? { received: offered.reduce((total, offer) => total + offer.received, 0), lots: offered.length, single: offered.filter((offer) => offer.received === 1).length } : null

  const firms = new Set(contracts.flatMap((contract) => contract.firms.map((firm) => firm.cui ?? firm.name)))
  const tedNo = raw.ted ?? source?.ted ?? null
  const reasonText = source?.annexD?.explanation ?? null
  const year = dates[0] ? Number(dates[0].slice(0, 4)) : (callRow?.publicationDate ? Number(callRow.publicationDate.slice(0, 4)) : undefined)

  return {
    read,
    vatExcluded: source !== null,
    id: row.id,
    kind,
    openedOnCall,
    noticeNo: awardRow?.noticeNo ?? row.noticeNo,
    title: tidyTitle(source?.title ?? awardRow?.title ?? callRow?.title ?? row.title),
    authority,
    procedureType,
    unpublished: procedureType ? isUnpublishedProcedure(procedureType) : false,
    contractType: source?.contractType ? (CONTRACT_TYPES[source.contractType.trim().toLowerCase()] ?? null) : null,
    legislation: lawOf(source?.legislation ?? null),
    framework,
    cpv: cpv(row.cpvCode ?? awardRow?.cpvCode ?? null),
    status: kind === 'award' ? 'awarded' : statusOf(row.status),
    estimate,
    awarded,
    call: source?.call ? { no: source.call.no, id: callRow?.id ?? null, date: source.call.date ?? callRow?.publicationDate ?? null, status: callRow ? statusOf(callRow.status) : null, estimate: callEstimate } : callRow ? refOf(callRow) : null,
    award: openedOnCall && awardRow ? refOf(awardRow) : null,
    awardNotice: versions.length > 0 ? { first: versions[0]!, last: versions[versions.length - 1]!, republished: versions.length - 1 } : null,
    contractsSpan: dates.length > 0 ? { from: dates[0]!, to: dates[dates.length - 1]! } : null,
    lots,
    lotsTotal: lots.length,
    lotsCancelled: lots.filter((lot) => lot.status === 'cancelled').length,
    offers,
    contracts: [...contracts].sort((a, b) => numberOrder(a.lots[0] ?? '', b.lots[0] ?? '') || (a.date ?? '').localeCompare(b.date ?? '')),
    callOffs: [...callOffs].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
    contractsCapped: !source && raw.contracts.length >= 50,
    foreign: foreign.map((contract) => ({ id: contract.id, no: contract.contractNo, date: contract.contractDate, authority: party(contract.authority.cui, contract.authority.name), supplier: party(contract.supplier.cui, contract.supplier.name), value: decimal(contract.valueRon) })),
    firmsCount: firms.size,
    ted: tedNo ? { no: tedNo, url: `https://ted.europa.eu/ro/notice/-/detail/${tedNo}` } : null,
    reason: source?.annexD ? { text: reasonText, urgency: source.annexD.forceMajeure, names: named ? refOf(named) : null } : null,
    namedBy: read === 'target' && namedBy ? { notice: refOf(namedBy), text: raw.reason?.explanation ?? null, awarded: namedBy.valueAccepted ? decimal(namedBy.awardedValueRon) : null } : null,
    source: source ? { kind: 'notice', url: noticePage(source.caNoticeId) } : row.sourceSystem === 'elicitatie' ? { kind: 'notice', url: row.sourceUrl?.replace(/api-pub\/C_PUBLIC_CANotice\/get\/(\d+)/u, 'pub/notices/ca-notices/view-c/$1') ?? '' } : { kind: 'export', url: row.sourceUrl, file: fileOf(row.sourceUrl) },
    year,
  }
}
