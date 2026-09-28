import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  SUPPLIER_DAYS_PER_REQUEST,
  supplierDaySchema,
  supplierDaysQuery,
  supplierRowsListSchema,
  supplierRowsQuery,
  supplierRowsTotalSchema,
  type SupplierDay,
  type SupplierDayRow,
  type SupplierRow,
} from './graphql/procurement-supplier-queries'
import { acceptedValue, partyOf } from './procurement-home-api'
import { readerCategories, type CategoryFigure } from '../lib/home-categories'
import { DIRECT_COMPARABLE_FROM, tidyName, tidyTitle, type HomeParty, type RecentRecord } from '../lib/home-model'
import type { CountyFigureRow } from '../lib/profile-model'
import { lastDayOf, type Period } from '../lib/profile-period'
import type { ContractPicture, Partner } from '../lib/supplier-model'

/**
 * A firm's contracts, from its own award rows: the record list keeps every
 * row SEAP publishes, where the analysis leaves a consortium's money out of
 * each member's figures.
 *
 * Several firms' rows under one notice and contract number are three things
 * that look alike (probed 2026-09-28): a consortium — one value, the same
 * firms on it (Hydrostroy and Patstroy, CNAIR 92/110645); a multi-supplier
 * framework — lots at their own values, each with its own competing
 * distributors (a hospital's „Acord cadru furnizare medicamente", thirty lots);
 * and a contract published at several values (revisions, or lots, of one
 * consortium). So an award is a notice, a contract number and a value — the
 * association design's own partition — and it is a consortium only when it is
 * not a framework and the firm has the same partners on every value under that
 * notice. Money is never summed across values that disagree under one
 * contract.
 */

/** Contract rows read for the consortium scan: the largest by value. */
export const SUPPLIER_ROWS_READ = 100
/** Records „Cele mai mari" lists per population. */
export const SUPPLIER_LARGEST_RECORDS = 8

type Raw = Readonly<Record<string, unknown>>

/** In chunks of `size`: the API's caps on one request. */
export function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let start = 0; start < items.length; start += size) out.push(items.slice(start, start + size))
  return out
}

/** A foreign legal form the registry's capitals leave unreadable („Ad" → „AD"). */
const FOREIGN_FORMS = /\b(Ad|Ead|Ood|Eood|Gmbh|Spa|Ag|Bv|Nv|Ltd|Llc)$/

/** A firm's name as a reader writes it: the capitals tidied, a foreign legal form kept in capitals, a quoted name capitalised. */
export function firmName(raw: { readonly cui: string | null; readonly name: string | null; readonly displayName: string | null }): HomeParty {
  const party = partyOf(raw)
  const name = party.name
    .replace(FOREIGN_FORMS, (form) => (form === 'Gmbh' ? 'GmbH' : form.toUpperCase()))
    .replace(/^(["„'])(\p{Ll})/u, (_, quote: string, letter: string) => `${quote}${letter.toLocaleUpperCase('ro-RO')}`)
  return { cui: party.cui, name }
}

/** A number as two sources may write it: no spaces, no case; none when empty. */
function numberKey(value: string | null): string | null {
  const key = value?.replace(/\s+/g, '').toLowerCase() ?? ''
  return key === '' ? null : key
}

/** A contract's identity: its notice and its contract number (a notice belongs to one buyer); none without both. */
function contractKey(row: { readonly noticeNo: string | null; readonly contractNo: string | null }): string | null {
  const notice = numberKey(row.noticeNo)
  const contract = numberKey(row.contractNo)
  return notice && contract ? `${notice}|${contract}` : null
}

/** Two sources write one value to the ban or the leu: values the same to the hundred lei are one. */
function valueKey(value: number): number {
  return Math.round(value / 100)
}

function numberOf(value: string | null): number | null {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** A multi-supplier framework says so in its title („Acord cadru", „acord-cadru"). */
function isFramework(title: string | null): boolean {
  const plain = (title ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  return /\bacord\W*(ul\W*)?cadru\b/.test(plain)
}

const partyKey = (party: HomeParty) => party.cui ?? party.name.toLocaleLowerCase('ro-RO')

// ───────────────────────────────────────────────────────── the reads ──

export interface SupplierRowsRead {
  /** Every award row of the year (the page's contracts); the rows read when the API could not count them. */
  readonly total: number
  /** Whether `total` is the API's count, not a floor. */
  readonly counted: boolean
  /** The largest ones, at most `SUPPLIER_ROWS_READ`. */
  readonly rows: readonly SupplierRow[]
  /** Award rows per complete year since 2019 (null: not counted). */
  readonly years: ReadonlyMap<number, number | null>
  /** Award rows per month of the year in progress (null: not counted). */
  readonly partMonths: ReadonlyMap<string, number | null>
}

export async function readSupplierRows(cui: string, period: Period, latest: number, signal?: AbortSignal): Promise<SupplierRowsRead> {
  const part = latest + 1
  const own = { supplierCui: { eq: cui }, recordKind: { in: ['contract_award'] } }
  const variables: Record<string, unknown> = { rows: { ...own, contractDate: period.range } }
  const years: number[] = []
  const months: string[] = []
  for (let year = DIRECT_COMPARABLE_FROM; year <= latest; year += 1) {
    years.push(year)
    variables[`y${year}`] = { ...own, contractDate: { gte: `${year}-01-01`, lte: `${year}-12-31` } }
  }
  for (let index = 1; index <= 12; index += 1) {
    const month = `${part}-${String(index).padStart(2, '0')}`
    months.push(month)
    variables[`m${index}`] = { ...own, contractDate: { gte: `${month}-01`, lte: lastDayOf(month) } }
  }
  const aliases = [...years.map((year) => `y${year}`), ...months.map((_, index) => `m${index + 1}`)]
  const raw = await graphqlQuery<Raw>(supplierRowsQuery(SUPPLIER_ROWS_READ, aliases), variables, { operationName: 'ProcurementSupplierRows', signal })
  const list = supplierRowsListSchema.parse(raw.rows)
  return {
    total: list.total ?? list.items.length,
    counted: list.total !== null,
    rows: list.items,
    years: new Map(years.map((year) => [year, supplierRowsTotalSchema.parse(raw[`y${year}`]).total])),
    partMonths: new Map(months.map((month, index) => [month, supplierRowsTotalSchema.parse(raw[`m${index + 1}`]).total])),
  }
}

/** The day a row's buyer signed it: where its co-winners' rows are. */
function dayOf(row: SupplierRow): string | null {
  return row.authority.cui && row.contractDate ? `${row.authority.cui}|${row.contractDate}` : null
}

/**
 * The award rows of every buyer and day the firm's rows fall on — one search
 * each, whatever the rows' values (a member's row may carry none) — in
 * requests of forty, side by side: the API's cap on one request.
 */
export async function readSupplierDays(rows: readonly SupplierRow[], signal?: AbortSignal): Promise<ReadonlyMap<string, SupplierDay>> {
  const days = [...new Set(rows.flatMap((row) => (contractKey(row) ? [dayOf(row)] : [])).filter((day): day is string => day !== null))]
  const answers = await Promise.all(
    chunks(days, SUPPLIER_DAYS_PER_REQUEST).map(async (batch) => {
      const variables = Object.fromEntries(
        batch.map((day, index) => {
          const [buyer, date] = day.split('|')
          return [`d${index}`, { authorityCui: { eq: buyer }, contractDate: { gte: date, lte: date }, recordKind: { in: ['contract_award'] } }]
        }),
      )
      const raw = await graphqlQuery<Raw>(supplierDaysQuery(batch.length), variables, { operationName: 'ProcurementSupplierPartners', signal })
      return batch.map((day, index) => [day, supplierDaySchema.parse(raw[`d${index}`])] as const)
    }),
  )
  return new Map(answers.flat())
}

// ─────────────────────────────────────────────────────── the picture ──

/** What the scan says of a row: its co-winners at its value, none, or that it cannot tell. */
type RowReading = { readonly kind: 'joint'; readonly others: readonly SupplierDayRow[] } | { readonly kind: 'alone' } | { readonly kind: 'unresolved' }

function readRow(cui: string, row: SupplierRow, days: ReadonlyMap<string, SupplierDay> | null): RowReading {
  const key = contractKey(row)
  const day = days && dayOf(row) ? days.get(dayOf(row) ?? '') : undefined
  if (!key || !day) return { kind: 'unresolved' }
  // Not the firm itself: its own twin rows, under its CUI or — from a source without one — its name.
  const self = firmName(row.supplier).name.toLocaleLowerCase('ro-RO')
  const candidates = day.items.filter(
    (item) => item.id !== row.id && item.supplier.cui !== cui && firmName(item.supplier).name.toLocaleLowerCase('ro-RO') !== self && contractKey(item) === key,
  )
  const own = acceptedValue(row.value)
  const valueOf = (item: SupplierDayRow) => {
    const value = numberOf(item.value.valueRonComparable)
    return value === null ? null : valueKey(value)
  }
  const values = new Set([...(own === null ? [] : [valueKey(own)]), ...candidates.flatMap((item) => (valueOf(item) === null ? [] : [valueOf(item)]))])
  // One value under the contract: every row on it is one award, a member's row with no value included.
  // Several (lots, revisions): the co-winners are the rows at the firm's own value; a row with none cannot be placed.
  const others = values.size <= 1 ? candidates : own === null ? [] : candidates.filter((item) => valueOf(item) === valueKey(own))
  const blank = values.size > 1 && candidates.some((item) => valueOf(item) === null)
  if (others.length > 0) return { kind: 'joint', others }
  if (blank || (own === null && values.size > 1)) return { kind: 'unresolved' }
  // A day with more awards than the read holds may hide a co-winner.
  return day.total !== null && day.total <= day.items.length ? { kind: 'alone' } : { kind: 'unresolved' }
}

interface Award {
  /** The contract (notice and number), or the row alone when it has none. */
  readonly contract: string
  readonly rows: readonly SupplierRow[]
  readonly value: number | null
  readonly reading: RowReading
  readonly consortium: boolean
}

/** The rows as awards — a contract and a value — each read once, the largest first. */
function awardsOf(cui: string, rows: readonly SupplierRow[], days: ReadonlyMap<string, SupplierDay> | null): readonly Award[] {
  const groups = new Map<string, SupplierRow[]>()
  for (const row of rows) {
    const contract = contractKey(row)
    const value = acceptedValue(row.value)
    const key = contract ? `${contract}|${value === null ? 'none' : valueKey(value)}` : `row:${row.id}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  const read = [...groups.values()].map((group) => {
    const readings = group.map((row) => readRow(cui, row, days))
    // A twin copy with no buyer or day takes its award's reading: any row that could tell, tells for all.
    const reading = readings.find((entry) => entry.kind === 'joint') ?? readings.find((entry) => entry.kind === 'alone') ?? readings[0] ?? { kind: 'unresolved' as const }
    const first = group[0] as SupplierRow
    return { contract: contractKey(first) ?? `row:${first.id}`, rows: group, value: acceptedValue(first.value), reading }
  })
  // A consortium keeps its partners on every value under a notice; a framework's lots each have their own competitors.
  const partnersByNotice = new Map<string, Set<string>>()
  for (const award of read) {
    if (award.reading.kind !== 'joint') continue
    const notice = award.contract.split('|')[0] ?? award.contract
    const set = award.reading.others.map((other) => partyKey(firmName(other.supplier))).sort().join(',')
    partnersByNotice.set(notice, new Set([...(partnersByNotice.get(notice) ?? []), set]))
  }
  return read.map((award) => {
    const notice = award.contract.split('|')[0] ?? award.contract
    const framework = award.rows.some((row) => isFramework(row.title))
    const consistent = (partnersByNotice.get(notice)?.size ?? 0) <= 1
    return { ...award, consortium: award.reading.kind === 'joint' && !framework && consistent }
  })
}

/**
 * The year's contracts from the firm's award rows. Counts are rows, as SEAP
 * publishes them and as the explorer lists them. Awards (a contract and a
 * value) are read once: their partners, the largest list, the categories.
 * Money sums a contract only when its rows agree on one value; one published
 * at several values is left out of the sums, and the sums say how many
 * contracts they cover. Clients, categories and counties come from the rows
 * only when every row was read.
 */
export function supplierContractPicture(
  cui: string,
  name: string,
  read: SupplierRowsRead,
  days: ReadonlyMap<string, SupplierDay> | null,
  places: ReadonlyMap<string, string> | null,
): ContractPicture {
  const awards = awardsOf(cui, read.rows, days)
  // A contract published at several values (lots, or revisions) has no one value to add.
  const valuesByContract = new Map<string, Set<number>>()
  for (const award of awards) {
    if (award.value !== null) valuesByContract.set(award.contract, new Set([...(valuesByContract.get(award.contract) ?? []), valueKey(award.value)]))
  }
  const single = (contract: string) => (valuesByContract.get(contract)?.size ?? 0) <= 1
  const consortium = awards.filter((award) => award.consortium)
  const consortiumContracts = new Map<string, Award>()
  for (const award of consortium) if (!consortiumContracts.has(award.contract)) consortiumContracts.set(award.contract, award)
  const valued = [...consortiumContracts.values()].filter((award) => award.value !== null && single(award.contract))

  // Partners: once per contract they shared with the firm.
  const partnerMap = new Map<string, { readonly cui: string | null; readonly name: string; readonly contracts: Set<string>; readonly buyers: Set<string> }>()
  for (const award of consortium) {
    if (award.reading.kind !== 'joint') continue
    const row = award.rows[0] as SupplierRow
    const buyer = tidyName(row.authority.displayName ?? row.authority.name ?? '')
    for (const other of award.reading.others) {
      const member = firmName(other.supplier)
      const key = partyKey(member)
      const entry = partnerMap.get(key) ?? { cui: member.cui, name: member.name, contracts: new Set<string>(), buyers: new Set<string>() }
      entry.contracts.add(award.contract)
      if (buyer) entry.buyers.add(buyer)
      partnerMap.set(key, entry)
    }
  }
  const complete = read.counted && read.rows.length >= read.total
  const byBuyer = new Map<string, number>()
  for (const row of read.rows) {
    if (row.authority.cui) byBuyer.set(row.authority.cui, (byBuyer.get(row.authority.cui) ?? 0) + 1)
  }
  const self = { cui, name }
  const rowsIn = (kinds: (award: Award) => boolean) => awards.filter(kinds).reduce((sum, award) => sum + award.rows.length, 0)
  return {
    count: read.total,
    scanned: read.rows.length,
    together: rowsIn((award) => award.consortium),
    togetherContracts: consortiumContracts.size,
    togetherValued: valued.length,
    togetherValue: valued.length > 0 ? valued.reduce((sum, award) => sum + (award.value ?? 0), 0) : null,
    unresolved: rowsIn((award) => award.reading.kind === 'unresolved'),
    partners: [...partnerMap.entries()]
      .map(([key, entry]): Partner => ({ key, cui: entry.cui, name: entry.name, contracts: entry.contracts.size, buyers: [...entry.buyers] }))
      .sort((a, b) => b.contracts - a.contracts || a.name.localeCompare(b.name, 'ro')),
    clients: complete
      ? {
          rankedBy: 'count',
          rows: [...byBuyer.entries()]
            .map(([buyer, count]) => ({ cui: buyer, count, value: null, share: read.rows.length > 0 ? count / read.rows.length : null }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
        }
      : null,
    buyers: complete ? byBuyer.size : null,
    // Each award at its own value, lots and revisions alike: a record SEAP published, listed, never summed.
    largest: awards
      .filter((award) => award.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, SUPPLIER_LARGEST_RECORDS)
      .map((award): RecentRecord => {
        const row = award.rows[0] as SupplierRow
        const partners = award.consortium && award.reading.kind === 'joint' ? award.reading.others.map((other) => firmName(other.supplier)) : []
        return {
          id: row.id,
          grain: 'contract',
          date: row.contractDate,
          title: tidyTitle(row.title),
          cpvCode: row.cpvCode,
          buyer: partyOf(row.authority),
          winners: [self, ...new Map(partners.map((partner) => [partyKey(partner), partner])).values()],
          value: award.value ?? 0,
        }
      }),
    categories: complete ? awardCategories(awards, single) : null,
    counties: complete && places ? rowCounties(read.rows, places) : null,
  }
}

/** The awards' reader categories from their own CPV codes; a contract of several values counts, at no value. */
function awardCategories(awards: readonly Award[], single: (contract: string) => boolean): readonly CategoryFigure[] {
  const valueOf = (award: Award) => (single(award.contract) ? award.value : null)
  const coded = awards.filter((award) => award.rows[0]?.cpvCode)
  const uncoded = awards.filter((award) => !award.rows[0]?.cpvCode)
  const unknownValue = uncoded.some((award) => valueOf(award) !== null) ? uncoded.reduce((sum, award) => sum + (valueOf(award) ?? 0), 0) : null
  return readerCategories(
    coded.map((award) => ({ prefix: award.rows[0]?.cpvCode ?? '', value: valueOf(award), count: 1 })),
    uncoded.length > 0 ? { prefix: '', value: unknownValue, count: uncoded.length } : null,
  )
}

/** The contract rows by the county their buyer sits in, by number; a buyer with no county is left to the rest. */
function rowCounties(rows: readonly SupplierRow[], places: ReadonlyMap<string, string>): readonly CountyFigureRow[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const county = row.authority.cui ? places.get(row.authority.cui) : undefined
    if (county) counts.set(county, (counts.get(county) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count, value: null, share: rows.length > 0 ? count / rows.length : null }))
    .sort((a, b) => b.count - a.count)
}
