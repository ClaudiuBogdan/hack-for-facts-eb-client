import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  contractAroundOf,
  contractSheetOf,
  type ContractRead,
  type ContractRow,
  type ContractSheet,
  type CtAroundSide,
  type CtContext,
  type CtContextInput,
  type CtYear,
} from '../lib/contract-model'
import { contextPeriodOf, cpvKey } from '../lib/direct-purchase-model'
import { DIRECT_COMPARABLE_FROM, homeYear } from '../lib/home-model'
import { buyerSeriesSchema, buyerStatsSchema, procurementBuyerQuery, type BuyerField } from './graphql/procurement-buyer-queries'
import {
  CONTRACT_AROUND_QUERY,
  CONTRACT_NOTICE_QUERY,
  CONTRACT_PAGE_QUERY,
  contractAroundSchema,
  contractNoticeSchema,
  contractPageSchema,
  type RawContractPage,
  type RawContractRow,
} from './graphql/procurement-contract-queries'
import { readCutoffOutcome, untilAborted } from './procurement-cutoff'
import { readNames } from './procurement-direct-purchase-api'

/**
 * One contract's reads, in two queries so a failure stays in its part of the
 * page:
 *
 * 1. **The contract** — the record with its amendments and procedure (one
 *    request), then its notice's rows (its firms, its versions, the notice's
 *    other contracts), then the names of everyone in them. The notice and the
 *    names fail soft: the contract stands alone, on its own names, and is
 *    `partial`. A missing record is `null`, never an error.
 * 2. **The context** — by count, never money (contract money is
 *    provisional): the pair's years, the pair's, the institution's and the
 *    firm's year (two analysis requests side by side) and the contracts
 *    around this one (a third). Each fails soft — its part null, never a
 *    zero — and the context is then `partial`.
 *
 * The award notice's own data (offers, lots, criterion, the contract's view)
 * is not served yet (`design.md` §17.7): `source` is `null` and the page
 * shows those parts where they arrive.
 */

/** The notice's first page: past it, the page counts the rest as a floor. */
const NOTICE_ROWS = 100
/** How many rows to read either side of this one: a contract's rows collapse into one, so more than the page lists. */
const AROUND_PER_SIDE = 12
/** How many the page lists either side. */
const AROUND_SHOWN = 3

const AWARDS = { grain: 'contract', recordKind: 'contract_award' } as const
const FRAMEWORKS = { grain: 'contract', recordKind: 'framework_agreement' } as const
const DIRECT = { grain: 'direct_acquisition' } as const

function rowOf(raw: RawContractRow): ContractRow {
  return {
    id: raw.id,
    contractNo: raw.contractNo,
    contractDate: raw.contractDate,
    noticeNo: raw.noticeNo,
    title: raw.title,
    supplier: raw.supplier,
    valueRon: raw.valueRon,
    currency: raw.currency,
    valueState: raw.value?.valueState ?? null,
    valueStateRule: raw.value?.valueStateRule ?? null,
    valueAccepted: raw.value?.valueAccepted ?? false,
    recordKind: raw.recordKind,
  }
}

/** The API's answer, as the model reads it. */
export function contractReadOf(raw: RawContractPage, notice: ContractRead['notice'], names: ContractRead['names']): ContractRead {
  const contract = raw.contract
  return {
    contract: {
      ...rowOf(contract),
      displayTitle: contract.displayTitle,
      authority: contract.authority,
      cpvCode: contract.cpvCode,
      estimatedValueRon: contract.estimatedValueRon,
      sourceSystem: contract.sourceSystem,
      sourceUrl: contract.sourceUrl,
      valueComparable: contract.value?.valueRonComparable ?? null,
      modifications: (contract.modifications ?? []).map((item) => ({
        id: item.id,
        date: item.modificationDate,
        before: item.valueBeforeRon,
        after: item.valueAfterRon,
        delta: item.valueDeltaRon,
        text: item.modificationType,
        contractNo: item.contractNo,
      })),
    },
    procedure: raw.procedure ? { id: raw.procedure.id, procedureType: raw.procedure.procedureType, authorityCui: raw.procedure.authority.cui, awardedValueRon: raw.procedure.awardedValueRon } : null,
    ted: raw.ted,
    duplicates: raw.duplicates.map((duplicate) => duplicate.sourceSystem),
    notice,
    names,
    source: null,
  }
}

type Settled<T> = { readonly ok: true; readonly value: T } | { readonly ok: false }

/** A read that fails soft — a reader who left fails it. */
async function soft<T>(read: Promise<T>, signal?: AbortSignal): Promise<Settled<T>> {
  try {
    return { ok: true, value: await read }
  } catch (error) {
    if (signal?.aborted) throw error
    return { ok: false }
  }
}

// ─────────────────────────────────────────────────────────── the contract ──

/**
 * The notice's rows, a page of them — the search is by text, so the page may
 * hold other notices' rows too (a call-off citing its framework's notice); the
 * model keeps this notice's. None to read without the notice's number or the
 * institution's CUI.
 */
async function readNotice(raw: RawContractPage, signal?: AbortSignal): Promise<ContractRead['notice']> {
  const { noticeNo, authority } = raw.contract
  if (!noticeNo || !authority.cui) return { rows: [], full: false, failed: false }
  const read = await soft(
    graphqlQuery<unknown>(CONTRACT_NOTICE_QUERY, { authorityCui: authority.cui, noticeNo, pageSize: NOTICE_ROWS }, { operationName: 'ProcurementContractNotice', signal }).then((data) =>
      contractNoticeSchema.parse(data),
    ),
    signal,
  )
  if (!read.ok) return { rows: [], full: false, failed: true }
  const { items } = read.value.procurementContracts
  return { rows: items.map(rowOf), full: items.length >= NOTICE_ROWS, failed: false }
}

/** The contract: the record, then its notice, then everyone's names. `null` when SEAP has no such record. */
export async function fetchContract(id: string, signal?: AbortSignal): Promise<ContractSheet | null> {
  const data = await graphqlQuery<unknown>(CONTRACT_PAGE_QUERY, { id }, { operationName: 'ProcurementContractPage', signal })
  const raw = contractPageSchema.parse(data).procurementContract
  if (!raw) return null
  const notice = await readNotice(raw, signal)
  // Only the notice's rows of this notice name the firms the page shows.
  const firms = notice.rows.filter((row) => row.noticeNo === raw.contract.noticeNo).map((row) => row.supplier.cui)
  const cuis = [...new Set([raw.contract.authority.cui, raw.contract.supplier.cui, ...firms].filter((cui): cui is string => Boolean(cui)))]
  const code = cpvKey(raw.contract.cpvCode)
  const names = await readNames(cuis, code ? [code] : [], raw.contract.authority.cui, signal)
  return contractSheetOf(contractReadOf(raw, notice, names))
}

// ──────────────────────────────────────────────────────────── the context ──

function analysisRead(operationName: string, fields: readonly BuyerField[], signal?: AbortSignal): Promise<Readonly<Record<string, unknown>>> {
  const variables = Object.fromEntries(fields.map((field) => [field.alias, field.scope]))
  return graphqlQuery<Readonly<Record<string, unknown>>>(procurementBuyerQuery(operationName, fields, false), variables, { operationName, signal })
}

function countOf(raw: unknown): number {
  return buyerStatsSchema.parse(raw).blocks[0]?.recordCount ?? 0
}

const PAIR_MEASURES = ['Awards', 'Frameworks', 'Direct', 'DirectValue'] as const

/**
 * The pair's years from 2019 to the last complete year, and the year in
 * progress counted only through `through` (its later months are the feed
 * thinning out): counts, and the direct purchases' money — clean, checked,
 * without VAT. No column for the year in progress without `through`.
 */
function yearsOf(raw: Readonly<Record<string, unknown>>, latest: number, through: string | null): readonly CtYear[] {
  const byYear = (alias: string) => new Map((buyerSeriesSchema.parse(raw[alias])[0]?.points ?? []).map((point) => [Number(point.bucket.slice(0, 4)), point.value]))
  const partOf = (alias: string) => {
    const kept = (buyerSeriesSchema.parse(raw[alias])[0]?.points ?? []).filter((point) => through !== null && point.bucket.slice(0, 7) <= through)
    return kept.some((point) => point.value !== null) ? kept.reduce((sum, point) => sum + (point.value ?? 0), 0) : null
  }
  const [awards, frameworks, direct, directLei] = PAIR_MEASURES.map((measure) => byYear(`pair${measure}`))
  const years: CtYear[] = Array.from({ length: Math.max(0, latest - DIRECT_COMPARABLE_FROM + 1) }, (_, index) => {
    const year = DIRECT_COMPARABLE_FROM + index
    return { year, awards: awards!.get(year) ?? 0, frameworks: frameworks!.get(year) ?? 0, direct: direct!.get(year) ?? 0, directLei: directLei!.get(year) ?? null }
  })
  if (through === null) return years
  const [partAwards, partFrameworks, partDirect, partDirectLei] = PAIR_MEASURES.map((measure) => partOf(`part${measure}`))
  return [...years, { year: latest + 1, awards: partAwards ?? 0, frameworks: partFrameworks ?? 0, direct: partDirect ?? 0, directLei: partDirectLei }]
}

/**
 * The institution and the firm around this contract: the pair's years from
 * 2019 to the year in progress, the pair's, the institution's and the firm's
 * year, and the contracts around. The year is the contract's; the year in
 * progress is read through SEAP's cutoff month for contracts (or the
 * contract's own, if later).
 */
export async function fetchContractContext(input: CtContextInput, sheet: ContractSheet, signal?: AbortSignal): Promise<CtContext> {
  const latest = homeYear()
  const part = latest + 1
  const year = Number(input.day.slice(0, 4))
  const pair = { authorityCui: input.authorityCui, supplierCui: input.supplierCui }
  // The complete years by year; the year in progress by month, cut at its cutoff once it is known.
  const span = { from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${latest}-12` }
  const partYear = { year: part }
  // Shared and kept: read on every page, it rarely costs a request.
  const cutoffRead = untilAborted(readCutoffOutcome(latest), signal)

  // Two requests side by side: the API resolves one request's fields one after another.
  const historyRead = soft(
    Promise.all([
      analysisRead(
        'ProcurementContractPair',
        [
          { alias: 'pairAwards', kind: 'series', scope: { ...pair, ...AWARDS, ...span }, args: 'bucket: year, measure: recordCount' },
          { alias: 'pairFrameworks', kind: 'series', scope: { ...pair, ...FRAMEWORKS, ...span }, args: 'bucket: year, measure: recordCount' },
          { alias: 'pairDirect', kind: 'series', scope: { ...pair, ...DIRECT, ...span }, args: 'bucket: year, measure: recordCount' },
          { alias: 'pairDirectValue', kind: 'series', scope: { ...pair, ...DIRECT, ...span }, args: 'bucket: year, measure: valueAwardedSum' },
        ],
        signal,
      ),
      analysisRead(
        'ProcurementContractPairPart',
        [
          { alias: 'partAwards', kind: 'series', scope: { ...pair, ...AWARDS, ...partYear }, args: 'bucket: month, measure: recordCount' },
          { alias: 'partFrameworks', kind: 'series', scope: { ...pair, ...FRAMEWORKS, ...partYear }, args: 'bucket: month, measure: recordCount' },
          { alias: 'partDirect', kind: 'series', scope: { ...pair, ...DIRECT, ...partYear }, args: 'bucket: month, measure: recordCount' },
          { alias: 'partDirectValue', kind: 'series', scope: { ...pair, ...DIRECT, ...partYear }, args: 'bucket: month, measure: valueAwardedSum' },
        ],
        signal,
      ),
    ]).then(([years, months]) => ({ ...years, ...months })),
    signal,
  )
  const both = { authorityCui: { eq: input.authorityCui }, supplierCui: { eq: input.supplierCui } }
  const aroundRead = soft(
    graphqlQuery<unknown>(
      CONTRACT_AROUND_QUERY,
      {
        all: { ...both, contractDate: { gte: `${DIRECT_COMPARABLE_FROM}-01-01` } },
        newer: { ...both, contractDate: { gte: input.day } },
        older: { ...both, contractDate: { lte: input.day } },
        perSide: AROUND_PER_SIDE,
      },
      { operationName: 'ProcurementContractAround', signal },
    ).then((raw) => contractAroundSchema.parse(raw)),
    signal,
  )

  // The year's reads: a complete year's at once, the year in progress's once its cutoff is known.
  const periodRead = year > latest ? cutoffRead.then((outcome) => contextPeriodOf(input.day, latest, outcome.cutoff.contract)) : Promise.resolve(contextPeriodOf(input.day, latest, null))
  const yearRead = periodRead.then((period) => {
    const within = { from: period.from, to: period.to }
    const buyerRead = soft(
      analysisRead(
        'ProcurementContractBuyer',
        [
          { alias: 'pairAwardsYear', kind: 'stats', scope: { ...pair, ...AWARDS, ...within } },
          { alias: 'pairFrameworksYear', kind: 'stats', scope: { ...pair, ...FRAMEWORKS, ...within } },
          { alias: 'buyerAwards', kind: 'stats', scope: { authorityCui: input.authorityCui, ...AWARDS, ...within } },
          { alias: 'buyerFrameworks', kind: 'stats', scope: { authorityCui: input.authorityCui, ...FRAMEWORKS, ...within } },
        ],
        signal,
      ),
      signal,
    )
    const sellerRead = soft(analysisRead('ProcurementContractSeller', [{ alias: 'sellerAwards', kind: 'stats', scope: { supplierCui: input.supplierCui, ...AWARDS, ...within } }], signal), signal)
    return Promise.all([period, buyerRead, sellerRead] as const)
  })
  // All awaited together: a reader who leaves fails them all at once, none left unheard.
  const [history, [period, buyer, seller], around, cutoff] = await Promise.all([historyRead, yearRead, aroundRead, cutoffRead])

  // The year in progress runs through its cutoff — or through the contract's month, when the contract is in it and later.
  const partThrough = year === part ? period.through : cutoff.cutoff.contract
  const lastThrough = partThrough?.startsWith(`${part}-`) ? partThrough : null
  const side = (items: readonly RawContractRow[]): CtAroundSide => ({ rows: items.map(rowOf), full: items.length >= AROUND_PER_SIDE })
  return {
    year: period.year,
    through: period.through,
    years: history.ok ? yearsOf(history.value, latest, lastThrough) : null,
    inProgress: lastThrough ? { year: part, through: lastThrough } : null,
    pair: buyer.ok ? { awards: countOf(buyer.value.pairAwardsYear), frameworks: countOf(buyer.value.pairFrameworksYear) } : null,
    buyer: buyer.ok ? { awards: countOf(buyer.value.buyerAwards), frameworks: countOf(buyer.value.buyerFrameworks) } : null,
    seller: seller.ok ? { awards: countOf(seller.value.sellerAwards) } : null,
    records: around.ok ? around.value.all.total : null,
    around: around.ok ? contractAroundOf(sheet, side(around.value.newer.items), side(around.value.older.items), AROUND_SHOWN) : [],
    partial: !history.ok || !buyer.ok || !seller.ok || !around.ok || cutoff.failed,
  }
}
