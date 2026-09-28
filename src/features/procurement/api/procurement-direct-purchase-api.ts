import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import { buyerName, tidyAddress } from '../lib/buyer-model'
import {
  aroundOf,
  contextPeriodOf,
  cpvKey,
  LISTED_FROM,
  mapDirectPurchase,
  NO_NAMES,
  type DirectPurchase,
  type DpContext,
  type DpContextInput,
  type DpLabel,
  type DpNames,
  type DpOther,
  type DpYear,
} from '../lib/direct-purchase-model'
import { DIRECT_COMPARABLE_FROM, homeYear, tidyTitle, truncatePartYear } from '../lib/home-model'
import { mapDirectAcquisition } from './graphql/procurement-mappers'
import { PROCUREMENT_DA_DETAIL_QUERY, PROCUREMENT_DA_RECORD_QUERY, procurementDaDetailResponseSchema, procurementDaRecordResponseSchema, type RawProcurementDaDetail } from './graphql/procurement-queries'
import {
  buyerBreakdownSchema,
  buyerSeriesSchema,
  buyerStatsSchema,
  procurementBuyerQuery,
  type BuyerField,
  type RawBuyerBreakdown,
} from './graphql/procurement-buyer-queries'
import {
  DIRECT_PURCHASE_AROUND_QUERY,
  DIRECT_PURCHASE_NAMES_QUERY,
  directPurchaseAroundSchema,
  directPurchaseNamesSchema,
  type RawAroundItem,
} from './graphql/procurement-direct-purchase-queries'
import { readCutoffOutcome, untilAborted } from './procurement-cutoff'

/**
 * One direct purchase's reads, in two queries so a failure stays in its part
 * of the page:
 *
 * 1. **The purchase** — the record with its detail (one request), then its
 *    names: the spine's labels, the budget platform's record of the
 *    institution and the CPV labels (a follow-up that fails soft: the record's
 *    own names stand and the purchase is `partial`). A missing record is
 *    `null`, never an error.
 * 2. **The context** — the pair's years, the institution's year and the
 *    firm's year (three analysis requests side by side: the API resolves one
 *    request's fields one after another) and the records around this one (a
 *    fourth). Each fails soft — its part null, never a zero — and the
 *    context is then `partial`.
 */

/** The budget platform's `CUI` takes at most ten digits; a longer identifier has no record to read. */
const ENTITY_CUI = /^\d{1,10}$/
/** How many records to read either side of this one. */
const AROUND_PER_SIDE = 4
/** How many the page lists either side. */
const AROUND_SHOWN = 3
/** A breakdown's top buckets: past them the API tells only that there are more. */
const RANKED = 100
/** The list's statuses but the cancelled: what the explorer lists between two parties by default. */
const LISTED_STATUSES = ['offered', 'awarded', 'finalized', 'unknown']

const decimal = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// ─────────────────────────────────────────────────────────── the purchase ──

/** The names the follow-up gives; a failed read is no names, said (`failed`), and a reader who left fails it. */
async function readNames(cuis: readonly string[], codes: readonly string[], authorityCui: string | null, signal?: AbortSignal): Promise<DpNames> {
  const withEntity = authorityCui !== null && ENTITY_CUI.test(authorityCui)
  if (cuis.length === 0 && codes.length === 0) return NO_NAMES
  try {
    const raw = await graphqlQuery<unknown>(
      DIRECT_PURCHASE_NAMES_QUERY,
      // The entity is left out for a CUI the platform cannot hold; its variable still needs a value.
      { cuis, codes, entityCui: withEntity ? authorityCui : '0', withEntity },
      { operationName: 'ProcurementDirectPurchaseNames', signal },
    )
    const parsed = directPurchaseNamesSchema.parse(raw)
    const labels = new Map<string, string>()
    for (const label of parsed.labels) if (label.cui && label.canonicalName && label.status === 'named') labels.set(label.cui, label.canonicalName)
    const cpv = new Map<string, DpLabel>()
    for (const code of parsed.cpv) if (code.labelRo || code.labelEn) cpv.set(code.cpvCode, { ro: code.labelRo, en: code.labelEn })
    // For a body it does not know, the budget platform names the entity by its CUI and holds no reference: no record at all.
    const known = parsed.entity && (parsed.entity.reference !== null || !/^\d+$/u.test(parsed.entity.organization?.name ?? ''))
    const entity = known ? (parsed.entity ?? null) : null
    const authority = entity
      ? (() => {
          const townHall = entity.reference?.isTerritorialExecutive ?? false
          const identity = {
            cui: authorityCui ?? '',
            name: buyerName(entity.organization?.name ?? entity.reference?.name ?? labels.get(authorityCui ?? '') ?? '', entity.territory, townHall),
            entityType: entity.reference?.entityType ?? null,
            isTownHall: townHall,
            place: entity.territory,
            population: null,
            address: tidyAddress(entity.reference?.address ?? null),
            hasBudget: entity.budget?.presence ?? false,
          }
          // What it is and where is said as the page renders, in its language: this read is kept and shared across languages.
          return { name: identity.name, identity, hasBudget: identity.hasBudget }
        })()
      : null
    return { labels, cpv, authority: authority && authority.name ? authority : null, failed: false }
  } catch (error) {
    if (signal?.aborted) throw error
    return { ...NO_NAMES, failed: true }
  }
}

/** An error the API raised inside the detail, not the record: the record can be read without it. */
function isDetailError(error: unknown): boolean {
  return error instanceof GraphQLRequestError && error.graphQLErrors.length > 0 && error.graphQLErrors.every((entry) => entry.path?.includes('detail'))
}

/**
 * The record with its detail; when the detail's own read errors, the record
 * alone, its detail said to be unavailable for now (`TEMPORARILY_UNAVAILABLE`).
 */
async function readRecord(id: string, signal?: AbortSignal): Promise<RawProcurementDaDetail | null> {
  try {
    const data = await graphqlQuery<unknown>(PROCUREMENT_DA_DETAIL_QUERY, { id }, { operationName: 'ProcurementDirectAcquisitionDetail', signal })
    return procurementDaDetailResponseSchema.parse(data).procurementDirectAcquisition
  } catch (error) {
    if (signal?.aborted || !isDetailError(error)) throw error
    const data = await graphqlQuery<unknown>(PROCUREMENT_DA_RECORD_QUERY, { id }, { operationName: 'ProcurementDirectAcquisitionRecord', signal })
    const found = procurementDaRecordResponseSchema.parse(data).procurementDirectAcquisition
    return found ? { directAcquisition: found.directAcquisition, detail: null, detailAvailability: 'TEMPORARILY_UNAVAILABLE', duplicates: [] } : null
  }
}

/** The purchase: the record, then its names. `null` when SEAP has no such record. */
export async function fetchDirectPurchase(id: string, signal?: AbortSignal): Promise<DirectPurchase | null> {
  const found = await readRecord(id, signal)
  if (found === null) return null
  const record = mapDirectAcquisition(found.directAcquisition)
  const detail = found.detailAvailability === 'AVAILABLE' ? found.detail : null
  const cuis = [record.authority.cui, record.supplier.cui].filter((cui): cui is string => Boolean(cui))
  const codes = [...new Set([record.cpvCode, ...(detail?.items ?? []).map((item) => item.cpvCode)].map(cpvKey).filter((code): code is string => code !== null))]
  const names = await readNames(cuis, codes, record.authority.cui, signal)
  return mapDirectPurchase(record, detail, found.detailAvailability, names, found.duplicates.map((duplicate) => duplicate.sourceSystem))
}

// ──────────────────────────────────────────────────────────── the context ──

/** A breakdown's rank of one key among its top buckets, how many top buckets there are, and whether there are more past them. */
function rankIn(raw: RawBuyerBreakdown, key: string): { readonly rank: number | null; readonly of: number; readonly more: boolean } {
  const buckets = raw[0]?.buckets ?? []
  const top = buckets.filter((bucket) => bucket.kind === 'top' && bucket.key !== null)
  const at = top.findIndex((bucket) => bucket.key === key)
  const more = buckets.some((bucket) => bucket.kind === 'other' && (bucket.recordCount ?? 0) > 0)
  return { rank: at < 0 ? null : at + 1, of: top.length, more }
}

function statsOf(raw: unknown): { readonly count: number; readonly value: number | null } {
  const block = buyerStatsSchema.parse(raw).blocks[0]
  return { count: block?.recordCount ?? 0, value: block?.valueAwardedSum ?? null }
}

function otherOf(item: RawAroundItem): DpOther {
  const done = item.status !== 'cancelled'
  return {
    id: item.id,
    code: item.uniqueCode,
    title: tidyTitle(item.title),
    // A purchase's checked value; an attempt's offer, struck on the page.
    value: done ? (item.value?.valueAccepted ? decimal(item.value.valueRonComparable) : null) : decimal(item.valueRon),
    // A purchase dated by its end, an attempt by its request — as its own page dates it.
    date: done ? (item.finalizationDate ?? item.publicationDate) : (item.publicationDate ?? item.finalizationDate),
    done,
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

function analysisRead(operationName: string, fields: readonly BuyerField[], signal?: AbortSignal): Promise<Readonly<Record<string, unknown>>> {
  const variables = Object.fromEntries(fields.map((field) => [field.alias, field.scope]))
  return graphqlQuery<Readonly<Record<string, unknown>>>(procurementBuyerQuery(operationName, fields, false), variables, { operationName, signal })
}

/** The pair's years: 2019 to the year in progress, that year cut at `through` (the last complete year's end when its cutoff is not known). */
function yearsOf(raw: Readonly<Record<string, unknown>>, part: number, through: string | null): readonly DpYear[] {
  const points = (alias: string) => buyerSeriesSchema.parse(raw[alias])[0]?.points ?? []
  const values = new Map(points('pairYearsValue').map((point) => [point.bucket.slice(0, 4), point.value]))
  const years = points('pairYearsCount').map((point) => ({ year: Number(point.bucket.slice(0, 4)), count: point.value, value: values.get(point.bucket.slice(0, 4)) ?? null }))
  const partValues = new Map(points('pairPartValue').map((point) => [point.bucket.slice(0, 7), point.value]))
  const months = points('pairPartCount').map((point) => ({ month: point.bucket.slice(0, 7), count: point.value, value: partValues.get(point.bucket.slice(0, 7)) ?? null }))
  return truncatePartYear(years, months, part, through)
    .filter((point) => point.year >= DIRECT_COMPARABLE_FROM && point.year <= part)
    .map((point) => ({ year: point.year, count: point.count ?? 0, value: point.value }))
}

/**
 * The institution and the firm around this purchase: the pair's years from
 * 2019 to the year in progress, the pair's, the institution's and the firm's
 * year with each one's place in the other's, and the records around. The
 * year is the purchase's; the year in progress is read through SEAP's cutoff
 * month (or the purchase's own, if later). Only the year's reads for a
 * purchase in the year in progress wait for the cutoff.
 */
export async function fetchDirectPurchaseContext(input: DpContextInput, purchase: DirectPurchase, signal?: AbortSignal): Promise<DpContext> {
  const latest = homeYear()
  const part = latest + 1
  const year = Number(input.yearDay.slice(0, 4))
  const grain = 'direct_acquisition'
  const pair = { authorityCui: input.authorityCui, supplierCui: input.supplierCui, grain }
  // Shared and kept: read on every page, it rarely costs a request.
  const cutoffRead = untilAborted(readCutoffOutcome(latest), signal)

  const historyRead = soft(
    analysisRead(
      'ProcurementDirectPurchasePair',
      [
        { alias: 'pairYearsCount', kind: 'series', scope: { ...pair, from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${part}-12` }, args: 'bucket: year, measure: recordCount' },
        { alias: 'pairYearsValue', kind: 'series', scope: { ...pair, from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${part}-12` }, args: 'bucket: year, measure: valueAwardedSum' },
        // The year in progress by month, cut at its last month read.
        { alias: 'pairPartCount', kind: 'series', scope: { ...pair, year: part }, args: 'bucket: month, measure: recordCount' },
        { alias: 'pairPartValue', kind: 'series', scope: { ...pair, year: part }, args: 'bucket: month, measure: valueAwardedSum' },
      ],
      signal,
    ),
    signal,
  )
  const both = { authorityCui: { eq: input.authorityCui }, supplierCui: { eq: input.supplierCui } }
  const aroundRead = soft(
    graphqlQuery<unknown>(
      DIRECT_PURCHASE_AROUND_QUERY,
      {
        all: { ...both, status: { in: LISTED_STATUSES }, publicationDate: { gte: LISTED_FROM } },
        newer: { ...both, publicationDate: { gte: input.day } },
        older: { ...both, publicationDate: { lte: input.day } },
        perSide: AROUND_PER_SIDE,
      },
      { operationName: 'ProcurementDirectPurchaseAround', signal },
    ).then((raw) => directPurchaseAroundSchema.parse(raw)),
    signal,
  )

  // The year's reads: a complete year's at once, the year in progress's once its cutoff is known.
  const periodRead = year > latest ? cutoffRead.then((outcome) => contextPeriodOf(input.yearDay, latest, outcome.cutoff.direct)) : Promise.resolve(contextPeriodOf(input.yearDay, latest, null))
  const yearRead = periodRead.then((period) => {
    const within = { from: period.from, to: period.to }
    const buyerRead = soft(
      analysisRead(
        'ProcurementDirectPurchaseBuyer',
        [
          { alias: 'pairYear', kind: 'stats', scope: { ...pair, ...within } },
          { alias: 'buyerYear', kind: 'stats', scope: { authorityCui: input.authorityCui, grain, ...within } },
          { alias: 'buyerSellers', kind: 'breakdown', scope: { authorityCui: input.authorityCui, grain, ...within }, args: `dimension: supplier, topN: ${RANKED}, rankBy: value` },
        ],
        signal,
      ),
      signal,
    )
    const sellerRead = soft(
      analysisRead(
        'ProcurementDirectPurchaseSeller',
        [
          { alias: 'sellerYear', kind: 'stats', scope: { supplierCui: input.supplierCui, grain, ...within } },
          { alias: 'sellerClients', kind: 'breakdown', scope: { supplierCui: input.supplierCui, grain, ...within }, args: `dimension: authority, topN: ${RANKED}, rankBy: value` },
        ],
        signal,
      ),
      signal,
    )
    return Promise.all([period, buyerRead, sellerRead] as const)
  })
  // All awaited together: a reader who leaves fails them all at once, none left unheard.
  const [historyRaw, [period, buyerRaw, sellerRaw], around, cutoff] = await Promise.all([historyRead, yearRead, aroundRead, cutoffRead])

  // The year in progress runs through its cutoff — or through the purchase's month, when the purchase is in it and later.
  const partThrough = year === part ? period.through : cutoff.cutoff.direct
  const lastThrough = partThrough?.startsWith(`${part}-`) ? partThrough : null
  const last = { year: lastThrough ? part : latest, through: lastThrough }
  const years = historyRaw.ok ? yearsOf(historyRaw.value, part, lastThrough).filter((point) => point.year <= last.year) : null

  const buyer: DpContext['buyer'] = buyerRaw.ok
    ? (() => {
        const stats = statsOf(buyerRaw.value.buyerYear)
        const place = rankIn(buyerBreakdownSchema.parse(buyerRaw.value.buyerSellers), input.supplierCui)
        return { count: stats.count, value: stats.value, sellers: place.of, more: place.more, rank: place.rank }
      })()
    : null
  const seller: DpContext['seller'] = sellerRaw.ok
    ? (() => {
        const stats = statsOf(sellerRaw.value.sellerYear)
        const place = rankIn(buyerBreakdownSchema.parse(sellerRaw.value.sellerClients), input.authorityCui)
        return { count: stats.count, value: stats.value, clients: place.of, more: place.more, rank: place.rank }
      })()
    : null

  return {
    year: period.year,
    through: period.through,
    years,
    last,
    records: around.ok && around.value.all.total !== null ? { count: around.value.all.total, estimated: around.value.all.totalEstimated } : null,
    pair: buyerRaw.ok ? statsOf(buyerRaw.value.pairYear) : null,
    buyer,
    seller,
    others: around.ok ? aroundOf(purchase, around.value.newer.items.map(otherOf), around.value.older.items.map(otherOf), AROUND_SHOWN) : [],
    partial: !historyRaw.ok || !buyerRaw.ok || !sellerRaw.ok || !around.ok || cutoff.failed,
  }
}
