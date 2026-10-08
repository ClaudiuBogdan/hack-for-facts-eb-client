import { isFunctioning } from '@/features/public-enterprises/lib/enterprise-model'
import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE, STATUS_STRUCK_OFF } from '@/features/private-companies/lib/company-status-codes'
import type { PortfolioAuthority, PortfolioEnterprise, SourceFamily } from './portfolio.data'

/**
 * The authority portfolio's model: who the sources put under one authority,
 * and what each source says of them. Pure functions over the snapshot. Every
 * status stays its source's own (never merged into one); a missing value is
 * null and sorts last, never as a zero; nothing is summed across enterprises.
 */

// ──────────────────────────────────────────────────────── membership ──

/** One enterprise on the page, and which sources put it under this authority. */
export type PortfolioRow = {
  readonly enterprise: PortfolioEnterprise
  readonly inList: boolean
  readonly inAnnouncements: boolean
}

/** Every enterprise either source puts under the authority: ANAF's list's first, then those only the announcements name. */
export function portfolioRows(authority: PortfolioAuthority, enterprises: Readonly<Record<string, PortfolioEnterprise>>): readonly PortfolioRow[] {
  const list = new Set(authority.s1001)
  const announcements = new Set(authority.jsonApt)
  const cuis = [...authority.s1001, ...authority.jsonApt.filter((cui) => !list.has(cui))]
  return cuis.flatMap((cui) => {
    const enterprise = enterprises[cui]
    return enterprise ? [{ enterprise, inList: list.has(cui), inAnnouncements: announcements.has(cui) }] : []
  })
}

/** Another authority a source names for the enterprise: a known CUI that is not this one. */
export type OtherAuthority = { readonly source: SourceFamily; readonly cui: string; readonly name: string | null }

const othersFrom = (row: PortfolioRow, authorityCui: string, source: SourceFamily): readonly OtherAuthority[] =>
  row.enterprise.edges.flatMap((edge) => (edge.source === source && edge.cui !== null && edge.cui !== authorityCui ? [{ source, cui: edge.cui, name: edge.name }] : []))

/**
 * Where the two sources part on this authority, one entry per enterprise:
 * - `announcements-elsewhere`: in ANAF's list under it; the announcements name only another authority;
 * - `list-elsewhere`: only the announcements put it here; ANAF's list names another;
 * - `list-none`: only the announcements put it here; ANAF's list names no authority for it (listed or not).
 * The announcements naming no one is not a disagreement: they cover only the selections AMEPIP published.
 */
export type Disagreement =
  | { readonly kind: 'announcements-elsewhere'; readonly row: PortfolioRow; readonly others: readonly OtherAuthority[] }
  | { readonly kind: 'list-elsewhere'; readonly row: PortfolioRow; readonly others: readonly OtherAuthority[] }
  | { readonly kind: 'list-none'; readonly row: PortfolioRow }

export function disagreements(authorityCui: string, rows: readonly PortfolioRow[]): readonly Disagreement[] {
  return rows.flatMap((row): Disagreement[] => {
    if (row.inList) {
      const others = othersFrom(row, authorityCui, 'json_apt')
      return !row.inAnnouncements && others.length > 0 ? [{ kind: 'announcements-elsewhere', row, others }] : []
    }
    const others = othersFrom(row, authorityCui, 's1001')
    return others.length > 0 ? [{ kind: 'list-elsewhere', row, others }] : [{ kind: 'list-none', row }]
  })
}

// ──────────────────────────────────────────────────────────── status ──

export type Tone = 'active' | 'warning' | 'struck-off' | 'unknown'

/** ANAF's list's word: ACTIV, INACTIV, a blank cell, or not in the list at all. */
export type ListState = 'active' | 'inactive' | 'blank' | 'absent'

export function listState(enterprise: PortfolioEnterprise): ListState {
  if (!enterprise.s1001) return 'absent'
  const status = enterprise.s1001.status?.trim().toUpperCase() ?? null
  if (status === 'ACTIV') return 'active'
  if (status === 'INACTIV') return 'inactive'
  return 'blank'
}

export const LIST_TONE: Readonly<Record<ListState, Tone>> = { active: 'active', inactive: 'warning', blank: 'unknown', absent: 'unknown' }

/** The trade registry's headline code, by the company page's own grouping. */
export type RegistryState = 'active' | 'struck-off' | 'insolvency' | 'dissolution' | 'other' | 'uncertain' | 'none'

export function registryState(enterprise: PortfolioEnterprise): RegistryState {
  const registry = enterprise.registry
  if (!registry) return 'none'
  const code = registry.code
  if (code === null) return 'uncertain'
  if (code === STATUS_ACTIVE) return 'active'
  if (code === STATUS_STRUCK_OFF) return 'struck-off'
  if ((INSOLVENCY_STATUSES as readonly string[]).includes(code)) return 'insolvency'
  if ((DISSOLUTION_STATUSES as readonly string[]).includes(code)) return 'dissolution'
  return 'other'
}

export const REGISTRY_TONE: Readonly<Record<RegistryState, Tone>> = {
  active: 'active',
  'struck-off': 'struck-off',
  insolvency: 'warning',
  dissolution: 'warning',
  other: 'unknown',
  uncertain: 'unknown',
  none: 'unknown',
}

/** A source's word on one enterprise that a row should flag: anything but „in business" where the source says something. */
export type Flag =
  | { readonly kind: 'amepip'; readonly year: number; readonly status: string | null }
  | { readonly kind: 'registry'; readonly state: RegistryState; readonly label: string | null }
  | { readonly kind: 'fiscal' }

/** What the other sources say that the ANAF list's word does not: AMEPIP's newest year, the trade registry, ANAF's inactive list. */
export function flagsOf(enterprise: PortfolioEnterprise): readonly Flag[] {
  const flags: Flag[] = []
  if (enterprise.amepip && !isFunctioning(enterprise.amepip.status)) flags.push({ kind: 'amepip', year: enterprise.amepip.year, status: enterprise.amepip.status })
  const registry = registryState(enterprise)
  if (registry === 'struck-off' || registry === 'insolvency' || registry === 'dissolution' || registry === 'other') {
    flags.push({ kind: 'registry', state: registry, label: enterprise.registry?.label ?? null })
  }
  if (enterprise.fiscallyInactive === true) flags.push({ kind: 'fiscal' })
  return flags
}

/** One part of a source's tally: a word, its count and its tone. `key` is the source's word, or a marker for none. */
export type Segment = { readonly key: string; readonly count: number; readonly tone: Tone }

const tallyBy = <K extends string>(rows: readonly PortfolioRow[], keyOf: (enterprise: PortfolioEnterprise) => K, toneOf: (key: K) => Tone, order: readonly K[]): readonly Segment[] => {
  const counts = new Map<K, number>()
  for (const row of rows) {
    const key = keyOf(row.enterprise)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const rank = (key: K) => (order.includes(key) ? order.indexOf(key) : order.length)
  return [...counts.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count, tone: toneOf(key) }))
}

/** `#none`: AMEPIP has no company-year row for it; `#functioning`: its newest row says „funcțiune". Anything else is AMEPIP's own words. */
export const AMEPIP_NONE = '#none'
export const AMEPIP_FUNCTIONING = '#functioning'
export const AMEPIP_BLANK = '#blank'

/**
 * Each source's tally over the page's enterprises, apart: ANAF's list, AMEPIP's
 * newest row (each enterprise's own newest year), the trade registry and
 * ANAF's inactive taxpayers. The parts of one source add up to the page's
 * enterprises; no part is ever moved to another source's.
 */
export function sourceTallies(rows: readonly PortfolioRow[]): {
  readonly list: readonly Segment[]
  readonly amepip: readonly Segment[]
  readonly registry: readonly Segment[]
  readonly fiscal: readonly Segment[]
} {
  return {
    list: tallyBy(rows, listState, (key) => LIST_TONE[key], ['active', 'inactive', 'blank', 'absent']),
    amepip: tallyBy(
      rows,
      (enterprise) => {
        if (!enterprise.amepip) return AMEPIP_NONE
        if (isFunctioning(enterprise.amepip.status)) return AMEPIP_FUNCTIONING
        return enterprise.amepip.status?.trim() || AMEPIP_BLANK
      },
      (key) => (key === AMEPIP_FUNCTIONING ? 'active' : key === AMEPIP_NONE || key === AMEPIP_BLANK ? 'unknown' : 'warning'),
      [AMEPIP_FUNCTIONING, AMEPIP_BLANK, AMEPIP_NONE],
    ),
    registry: tallyBy(rows, registryState, (key) => REGISTRY_TONE[key], ['active', 'insolvency', 'dissolution', 'struck-off', 'other', 'uncertain', 'none']),
    fiscal: tallyBy(
      rows,
      (enterprise) => (enterprise.fiscallyInactive === true ? 'inactive' : enterprise.fiscallyInactive === false ? 'active' : 'unknown'),
      (key) => (key === 'inactive' ? 'warning' : key === 'active' ? 'active' : 'unknown'),
      ['active', 'inactive', 'unknown'],
    ),
  }
}

/** The AMEPIP years the newest rows come from: one year said as one, several as a span. */
export function amepipYearSpan(rows: readonly PortfolioRow[]): { readonly from: number; readonly to: number } | null {
  const years = rows.flatMap((row) => (row.enterprise.amepip ? [row.enterprise.amepip.year] : []))
  return years.length > 0 ? { from: Math.min(...years), to: Math.max(...years) } : null
}

/** In ANAF's list as active, while another source says otherwise: the rows a reader should see first. */
export function isContradicted(enterprise: PortfolioEnterprise): boolean {
  return listState(enterprise) === 'active' && flagsOf(enterprise).length > 0
}

// ──────────────────────────────────────────────────────────── size ──

export type SizeMeasure = 'cifra' | 'salariati' | 'pierdere'

/** The statement's admitted value, as written: a zero is a zero, null is no admitted value. The loss measure reads the net result. */
export function figureOf(enterprise: PortfolioEnterprise, measure: SizeMeasure): string | null {
  const { turnover, employees, net } = enterprise.financials
  return measure === 'cifra' ? turnover : measure === 'salariati' ? employees : net
}

/** What a ranking draws: a positive value (a loss: a negative net result, as its size); anything else is not on it. */
export function measureValue(enterprise: PortfolioEnterprise, measure: SizeMeasure): string | null {
  const value = figureOf(enterprise, measure)
  if (value === null) return null
  if (measure === 'pierdere') return Number(value) < 0 ? value.replace(/^-/u, '') : null
  return Number(value) > 0 ? value : null
}

/** Ranked by the measure, the largest first; the rows it does not rank apart, in the page's order. */
export function rankBy(rows: readonly PortfolioRow[], measure: SizeMeasure): { readonly ranked: readonly PortfolioRow[]; readonly without: readonly PortfolioRow[] } {
  const valued = rows.filter((row) => measureValue(row.enterprise, measure) !== null)
  const ranked = [...valued].sort((a, b) => Number(measureValue(b.enterprise, measure)) - Number(measureValue(a.enterprise, measure)))
  return { ranked, without: rows.filter((row) => measureValue(row.enterprise, measure) === null) }
}

/**
 * Why a row has no admitted figure for the year: no statement ever, an older
 * or a newer one only, or a statement whose value the evaluator held back
 * (`held`, with its reason), left blank (`missing`), did not admit or did not
 * assess — the company page's own policy, never a zero.
 */
export type MissingFigure =
  | { readonly kind: 'never' }
  | { readonly kind: 'older'; readonly year: number }
  | { readonly kind: 'newer'; readonly year: number }
  | { readonly kind: 'held'; readonly reason: 'profile' | 'observation' | 'quality' | 'component' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'not-admitted' }

const STATUS_KEY: Readonly<Record<SizeMeasure, 'turnover' | 'employees' | 'net'>> = { cifra: 'turnover', salariati: 'employees', pierdere: 'net' }

export function missingFigure(enterprise: PortfolioEnterprise, measure: SizeMeasure, year: number): MissingFigure {
  const { filed, newestYear, statuses } = enterprise.financials
  if (!filed) {
    if (newestYear === null) return { kind: 'never' }
    return newestYear < year ? { kind: 'older', year: newestYear } : { kind: 'newer', year: newestYear }
  }
  const status = statuses[STATUS_KEY[measure]]
  const held = /^held_(profile|observation|quality|component)$/u.exec(status ?? '')
  if (held) return { kind: 'held', reason: held[1] as 'profile' | 'observation' | 'quality' | 'component' }
  if (status === 'missing') return { kind: 'missing' }
  return { kind: 'not-admitted' }
}

// ──────────────────────────────────────────────────────────── table ──

export type TableSort = SizeMeasure | 'nume'
export type TableFilter = 'toate' | 'active' | 'inactive' | 'altele'

export function filterRows(rows: readonly PortfolioRow[], filter: TableFilter): readonly PortfolioRow[] {
  if (filter === 'toate') return rows
  return rows.filter((row) => {
    const state = listState(row.enterprise)
    return filter === 'active' ? state === 'active' : filter === 'inactive' ? state === 'inactive' : state === 'blank' || state === 'absent'
  })
}

const byName = (a: PortfolioRow, b: PortfolioRow) => (a.enterprise.name ?? a.enterprise.cui).localeCompare(b.enterprise.name ?? b.enterprise.cui, 'ro')

/** Sorted for the table: the largest value first (the loss: the lowest net result first), the rows with no admitted value after, by name. */
export function sortRows(rows: readonly PortfolioRow[], sort: TableSort): readonly PortfolioRow[] {
  if (sort === 'nume') return [...rows].sort(byName)
  const valued = rows.filter((row) => figureOf(row.enterprise, sort) !== null)
  const direction = sort === 'pierdere' ? 1 : -1
  const ordered = [...valued].sort((a, b) => direction * (Number(figureOf(a.enterprise, sort)) - Number(figureOf(b.enterprise, sort))) || byName(a, b))
  return [...ordered, ...rows.filter((row) => figureOf(row.enterprise, sort) === null).sort(byName)]
}

// ──────────────────────────────────────────────────────── by status ──

export type StatusGroup = { readonly state: ListState; readonly rows: readonly PortfolioRow[] }

/** By ANAF's list's word, in that order; each group's largest first by turnover, the contradicted ones flagged in place. */
export function statusGroups(rows: readonly PortfolioRow[]): readonly StatusGroup[] {
  const order: readonly ListState[] = ['active', 'inactive', 'blank', 'absent']
  return order.flatMap((state) => {
    const members = rows.filter((row) => listState(row.enterprise) === state)
    return members.length > 0 ? [{ state, rows: sortRows(members, 'cifra') }] : []
  })
}

// ──────────────────────────────────────────────────── what and where ──

export type Count = { readonly key: string | null; readonly count: number }

const countBy = (rows: readonly PortfolioRow[], keyOf: (enterprise: PortfolioEnterprise) => string | null): readonly Count[] => {
  const counts = new Map<string | null, number>()
  for (const row of rows) {
    const key = keyOf(row.enterprise)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (a.key === null ? 1 : 0) - (b.key === null ? 1 : 0) || b.count - a.count || String(a.key).localeCompare(String(b.key)))
}

/** By the first two digits of the main CAEN code; null: no main activity on record (last). */
export const activities = (rows: readonly PortfolioRow[]) => countBy(rows, (enterprise) => enterprise.caen?.slice(0, 2) ?? null)

/** By the seat's county; null: no seat on record (last). */
export const counties = (rows: readonly PortfolioRow[]) => countBy(rows, (enterprise) => enterprise.county)

// ─────────────────────────────────────────────────────────── figures ──

/**
 * Counts of enterprises, never sums: with a statement for the year, those
 * reporting a loss in it, and those SEAP records as buying or selling. A
 * SEAP count it did not answer makes those two floors (`seapUnknown`).
 */
export function portfolioFigures(rows: readonly PortfolioRow[]): {
  readonly filed: number
  readonly loss: number
  readonly netReported: number
  readonly buyers: number
  readonly sellers: number
  readonly seapUnknown: number
} {
  const enterprises = rows.map((row) => row.enterprise)
  const withNet = enterprises.filter((enterprise) => enterprise.financials.net !== null)
  return {
    filed: enterprises.filter((enterprise) => enterprise.financials.filed).length,
    netReported: withNet.length,
    loss: withNet.filter((enterprise) => Number(enterprise.financials.net) < 0).length,
    buyers: enterprises.filter((enterprise) => (enterprise.seap?.buyerDirect ?? 0) > 0 || (enterprise.seap?.buyerAwards ?? 0) > 0).length,
    sellers: enterprises.filter((enterprise) => (enterprise.seap?.supplierDirect ?? 0) > 0).length,
    seapUnknown: enterprises.filter((enterprise) => !enterprise.seap || enterprise.seap.buyerDirect === null || enterprise.seap.buyerAwards === null || enterprise.seap.supplierDirect === null).length,
  }
}
