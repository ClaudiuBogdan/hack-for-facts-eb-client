import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE, STATUS_STRUCK_OFF } from '@/features/private-companies/lib/company-status-codes'
import type { PublicEnterprisePortfolioFilter, PublicEnterprisePortfolioSort } from '@/schemas/public-enterprises'
import type { AuthorityPortfolio, PortfolioEnterprise } from '@/schemas/public-enterprise-portfolio'
import { isFunctioning } from './enterprise-model'

/**
 * The authority portfolio's model (`/public-enterprises/authorities/$cui`):
 * who the sources put under one authority, and what each source says of
 * them. Pure functions over one authority's part of the snapshot. Every
 * status stays its source's own, never merged into one; a missing value is
 * null and sorts last, never as a zero; nothing is summed across enterprises.
 */

// ──────────────────────────────────────────────────────── membership ──

/** One enterprise on the page, and which sources put it under this authority. */
export type PortfolioRow = {
  readonly enterprise: PortfolioEnterprise
  readonly inList: boolean
  readonly inAnnouncements: boolean
}

/** The page's enterprises in the snapshot's order (ANAF's list's first, then those only the announcements name), each with its sources. */
export function portfolioRows(portfolio: AuthorityPortfolio): readonly PortfolioRow[] {
  const list = new Set(portfolio.authority.s1001)
  const announcements = new Set(portfolio.authority.jsonApt)
  return portfolio.enterprises.map((enterprise) => ({ enterprise, inList: list.has(enterprise.cui), inAnnouncements: announcements.has(enterprise.cui) }))
}

/** Whether a source's lane was down when the snapshot was read: then nothing it would have said can be said. */
export function isSourceDown(portfolio: AuthorityPortfolio, family: 's1001' | 'json_apt' | 'amepip'): boolean {
  return portfolio.sources.find((source) => source.family === family)?.laneStatus === 'unavailable'
}

/** The lanes down at read time: a source that was not read is never counted as saying „none". */
export type DownLanes = { readonly list: boolean; readonly announcements: boolean; readonly amepip: boolean }

export const NO_LANE_DOWN: DownLanes = { list: false, announcements: false, amepip: false }

export function downLanes(portfolio: AuthorityPortfolio): DownLanes {
  return { list: isSourceDown(portfolio, 's1001'), announcements: isSourceDown(portfolio, 'json_apt'), amepip: isSourceDown(portfolio, 'amepip') }
}

/** Another authority a source names for the enterprise: a known CUI that is not this one. */
export type OtherAuthority = { readonly source: 's1001' | 'json_apt'; readonly cui: string; readonly name: string | null }

const othersFrom = (row: PortfolioRow, authorityCui: string, source: 's1001' | 'json_apt'): readonly OtherAuthority[] =>
  row.enterprise.edges.flatMap((edge) => (edge.source === source && edge.cui !== null && edge.cui !== authorityCui ? [{ source, cui: edge.cui, name: edge.name }] : []))

/**
 * Where the two sources part on this authority, one entry per enterprise:
 * - `announcements-elsewhere`: in ANAF's list under it; the announcements name only another authority;
 * - `list-elsewhere`: only the announcements put it here; ANAF's list names another;
 * - `list-none`: only the announcements put it here; ANAF's list names no authority for it (listed or not).
 * The announcements naming no one is not a disagreement: they cover only the selections AMEPIP published.
 * A comparison needs both sources read: with a lane down, the comparisons it would take are not made.
 */
export type Disagreement =
  | { readonly kind: 'announcements-elsewhere'; readonly row: PortfolioRow; readonly others: readonly OtherAuthority[] }
  | { readonly kind: 'list-elsewhere'; readonly row: PortfolioRow; readonly others: readonly OtherAuthority[] }
  | { readonly kind: 'list-none'; readonly row: PortfolioRow }

export function disagreements(authorityCui: string, rows: readonly PortfolioRow[], down: DownLanes = NO_LANE_DOWN): readonly Disagreement[] {
  return rows.flatMap((row): Disagreement[] => {
    if (row.inList) {
      const others = down.announcements ? [] : othersFrom(row, authorityCui, 'json_apt')
      return !row.inAnnouncements && others.length > 0 ? [{ kind: 'announcements-elsewhere', row, others }] : []
    }
    if (down.list) return []
    const others = othersFrom(row, authorityCui, 's1001')
    return others.length > 0 ? [{ kind: 'list-elsewhere', row, others }] : [{ kind: 'list-none', row }]
  })
}

// ──────────────────────────────────────────────────────────── status ──

export type Tone = 'active' | 'warning' | 'struck-off' | 'unknown'

/** ANAF's list's word: ACTIV, INACTIV, a blank or other cell, not in the list, or the list not read. */
export type ListState = 'active' | 'inactive' | 'blank' | 'absent' | 'unread'

export function listState(enterprise: PortfolioEnterprise, down: DownLanes = NO_LANE_DOWN): ListState {
  if (!enterprise.s1001) return down.list ? 'unread' : 'absent'
  const status = enterprise.s1001.status?.trim().toUpperCase() ?? null
  if (status === 'ACTIV') return 'active'
  if (status === 'INACTIV') return 'inactive'
  return 'blank'
}

/**
 * ANAF's list's word on one row of this page, as the panel, the table's column and its filter all read it: the
 * list's own word for the enterprises the list puts under this authority, and, for those only the announcements
 * put here, where the list has them: under another authority, listed with none named, not in it, or the list not
 * read. So the panel's row adds up to the page and agrees with the head's count, and the filter with the panel.
 */
export type ListTallyKey = 'active' | 'inactive' | 'blank' | 'elsewhere' | 'unnamed' | 'absent' | 'unread'

export const LIST_TALLY_TONE: Readonly<Record<ListTallyKey, Tone>> = { active: 'active', inactive: 'warning', blank: 'unknown', elsewhere: 'unknown', unnamed: 'unknown', absent: 'unknown', unread: 'unknown' }

export function listTallyKey(row: PortfolioRow, authorityCui: string, down: DownLanes = NO_LANE_DOWN): ListTallyKey {
  const state = listState(row.enterprise, down)
  if (row.inList) return state === 'active' || state === 'inactive' ? state : 'blank'
  if (state === 'unread') return 'unread'
  if (!row.enterprise.s1001) return 'absent'
  return othersFrom(row, authorityCui, 's1001').length > 0 ? 'elsewhere' : 'unnamed'
}

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

/** A source's word on one enterprise that its row should carry: anything but „in business", where the source says something sure. */
export type Flag =
  | { readonly kind: 'amepip'; readonly year: number; readonly status: string | null }
  | { readonly kind: 'registry'; readonly state: RegistryState; readonly label: string | null }
  | { readonly kind: 'fiscal' }

/** What the other sources say beside ANAF's list: AMEPIP's newest year, the trade registry, ANAF's inactive taxpayers. A registry whose evidence conflicts flags nothing. */
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

/** One part of a source's tally: a word (or a marker for none), its count and its tone. */
export type Segment = { readonly key: string; readonly count: number; readonly tone: Tone }

const tallyBy = (rows: readonly PortfolioRow[], keyOf: (row: PortfolioRow) => string, toneOf: (key: string) => Tone, order: readonly string[]): readonly Segment[] => {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = keyOf(row)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length)
  // Ties in Romanian collation: the server's and the browser's default collations differ.
  return [...counts.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0], 'ro'))
    .map(([key, count]) => ({ key, count, tone: toneOf(key) }))
}

/** AMEPIP's markers: no company-year row; the register not read; its newest row says „funcțiune"; a row with a blank status. Any other key is AMEPIP's own words. */
export const AMEPIP_NONE = '#none'
export const AMEPIP_UNREAD = '#unread'
export const AMEPIP_FUNCTIONING = '#functioning'
export const AMEPIP_BLANK = '#blank'

export type SourceTallies = {
  readonly list: readonly Segment[]
  readonly amepip: readonly Segment[]
  readonly registry: readonly Segment[]
  readonly fiscal: readonly Segment[]
}

/**
 * Each source's tally over the page's enterprises, apart: ANAF's list (see
 * `ListTallyKey`), AMEPIP's newest row (each enterprise's own newest year),
 * the trade registry, ANAF's inactive taxpayers. A source's parts add up to
 * the page's enterprises on their own; no part ever moves to another source's;
 * a lane down at read time is one part, „not read", never „none".
 */
export function sourceTallies(rows: readonly PortfolioRow[], authorityCui: string, down: DownLanes = NO_LANE_DOWN): SourceTallies {
  return {
    list: tallyBy(rows, (row) => listTallyKey(row, authorityCui, down), (key) => LIST_TALLY_TONE[key as ListTallyKey], ['active', 'inactive', 'blank', 'elsewhere', 'unnamed', 'absent', 'unread']),
    amepip: tallyBy(
      rows,
      ({ enterprise }) => {
        if (!enterprise.amepip) return down.amepip ? AMEPIP_UNREAD : AMEPIP_NONE
        if (isFunctioning(enterprise.amepip.status)) return AMEPIP_FUNCTIONING
        return enterprise.amepip.status?.trim() || AMEPIP_BLANK
      },
      (key) => (key === AMEPIP_FUNCTIONING ? 'active' : key === AMEPIP_NONE || key === AMEPIP_BLANK || key === AMEPIP_UNREAD ? 'unknown' : 'warning'),
      [AMEPIP_FUNCTIONING, AMEPIP_BLANK, AMEPIP_NONE, AMEPIP_UNREAD],
    ),
    registry: tallyBy(rows, ({ enterprise }) => registryState(enterprise), (key) => REGISTRY_TONE[key as RegistryState], ['active', 'insolvency', 'dissolution', 'struck-off', 'other', 'uncertain', 'none']),
    // No company record says nothing of the fiscal flag either; a record without the flag is said apart.
    fiscal: tallyBy(
      rows,
      ({ enterprise }) => (enterprise.fiscallyInactive === true ? 'inactive' : enterprise.fiscallyInactive === false ? 'active' : enterprise.registry === null ? 'none' : 'unknown'),
      (key) => (key === 'inactive' ? 'warning' : key === 'active' ? 'active' : 'unknown'),
      ['active', 'inactive', 'unknown', 'none'],
    ),
  }
}

/** The registry's own labels for one state (a state groups several codes), joined; null when none carries one. */
export function registryLabels(rows: readonly PortfolioRow[], state: string): string | null {
  const labels = [...new Set(rows.flatMap((row) => (row.enterprise.registry?.label && registryState(row.enterprise) === state ? [row.enterprise.registry.label] : [])))]
  return labels.length > 0 ? labels.join(', ') : null
}

/** The years AMEPIP's newest rows come from. */
export function amepipYearSpan(rows: readonly PortfolioRow[]): { readonly from: number; readonly to: number } | null {
  const years = rows.flatMap((row) => (row.enterprise.amepip ? [row.enterprise.amepip.year] : []))
  return years.length > 0 ? { from: Math.min(...years), to: Math.max(...years) } : null
}

// ──────────────────────────────────────────────────────────── figures ──

export type FigureMeasure = 'turnover' | 'employees' | 'net'

/** The statement's admitted value, as written: a zero is a zero, null is no admitted value. */
export function figureOf(enterprise: PortfolioEnterprise, measure: FigureMeasure): string | null {
  return enterprise.financials[measure]
}

/**
 * Why a cell has no admitted figure for the year: no statement ever, an
 * older or a newer one only, or a statement whose value the evaluator held
 * back (with its reason), left blank, did not admit or did not assess — the
 * company page's own policy, never a zero.
 */
export type MissingFigure =
  | { readonly kind: 'never' }
  /** No statement for the year; the newest it filed is for `year` (older or later: the snapshot keeps only the newest). */
  | { readonly kind: 'last'; readonly year: number }
  | { readonly kind: 'held'; readonly reason: HeldReason }
  | { readonly kind: 'missing' }
  | { readonly kind: 'not-admitted' }

export type HeldReason = 'profile' | 'observation' | 'quality' | 'component'

export function missingFigure(enterprise: PortfolioEnterprise, measure: FigureMeasure): MissingFigure {
  const { filed, newestYear, statuses } = enterprise.financials
  if (!filed) return newestYear === null ? { kind: 'never' } : { kind: 'last', year: newestYear }
  const status = statuses[measure]
  const held = /^held_(profile|observation|quality|component)$/u.exec(status ?? '')
  if (held) return { kind: 'held', reason: held[1] as HeldReason }
  if (status === 'missing') return { kind: 'missing' }
  return { kind: 'not-admitted' }
}

/** The reasons the evaluator held back a value shown missing in these rows, for the note under them. */
export function heldReasons(rows: readonly PortfolioRow[], measures: readonly FigureMeasure[]): ReadonlySet<HeldReason> {
  const reasons = new Set<HeldReason>()
  for (const row of rows) {
    for (const measure of measures) {
      if (figureOf(row.enterprise, measure) !== null) continue
      const missing = missingFigure(row.enterprise, measure)
      if (missing.kind === 'held') reasons.add(missing.reason)
    }
  }
  return reasons
}

// ──────────────────────────────────────────────────────────── table ──

/** By the table's „Lista ANAF" column, the panel's word: active and inactive are the list's own enterprises here; the rest is everything else. */
export function filterRows(rows: readonly PortfolioRow[], filter: PublicEnterprisePortfolioFilter, authorityCui: string, down: DownLanes = NO_LANE_DOWN): readonly PortfolioRow[] {
  if (filter === 'toate') return rows
  return rows.filter((row) => {
    const key = listTallyKey(row, authorityCui, down)
    if (filter === 'active') return key === 'active'
    if (filter === 'inactive') return key === 'inactive'
    return key !== 'active' && key !== 'inactive'
  })
}

const byName = (a: PortfolioRow, b: PortfolioRow) => (a.enterprise.name ?? a.enterprise.cui).localeCompare(b.enterprise.name ?? b.enterprise.cui, 'ro')

const SORT_MEASURE: Readonly<Record<Exclude<PublicEnterprisePortfolioSort, 'nume'>, FigureMeasure>> = { cifra: 'turnover', salariati: 'employees', rezultat: 'net' }

/** The table's order: the largest value first (the net result: the lowest first, so the largest loss leads), the rows with no admitted value after, by name. */
export function sortRows(rows: readonly PortfolioRow[], sort: PublicEnterprisePortfolioSort): readonly PortfolioRow[] {
  if (sort === 'nume') return [...rows].sort(byName)
  const measure = SORT_MEASURE[sort]
  const direction = sort === 'rezultat' ? 1 : -1
  const valued = rows.filter((row) => figureOf(row.enterprise, measure) !== null)
  const ordered = [...valued].sort((a, b) => direction * (Number(figureOf(a.enterprise, measure)) - Number(figureOf(b.enterprise, measure))) || byName(a, b))
  return [...ordered, ...rows.filter((row) => figureOf(row.enterprise, measure) === null).sort(byName)]
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
    .sort((a, b) => (a.key === null ? 1 : 0) - (b.key === null ? 1 : 0) || b.count - a.count || String(a.key).localeCompare(String(b.key), 'ro'))
}

/** By the first two digits of the main CAEN code; null (no main activity on record) last. */
export const activityCounts = (rows: readonly PortfolioRow[]) => countBy(rows, (enterprise) => enterprise.caen?.slice(0, 2) ?? null)

/** By the seat's county; null (no seat on record) last. */
export const countyCounts = (rows: readonly PortfolioRow[]) => countBy(rows, (enterprise) => enterprise.county)

// ─────────────────────────────────────────────────────────── counts ──

export type PortfolioFigures = {
  readonly filed: number
  readonly netReported: number
  readonly loss: number
  /** Recorded in SEAP as buying: a direct purchase or a contract award. */
  readonly buyers: number
  /** Not counted as buyers, with a buyer count SEAP did not answer: `buyers` is a floor when this is above zero. */
  readonly buyersUnknown: number
  /** Recorded in SEAP as selling through direct purchases (supplier contract awards are not read). */
  readonly directSellers: number
  /** With no answer for direct sales: `directSellers` is a floor when this is above zero. */
  readonly directSellersUnknown: number
}

/** Counts of enterprises, never sums: with a statement for the year, reporting a loss in it, buying through SEAP, selling through direct purchases. */
export function portfolioFigures(rows: readonly PortfolioRow[]): PortfolioFigures {
  const enterprises = rows.map((row) => row.enterprise)
  const withNet = enterprises.filter((enterprise) => enterprise.financials.net !== null)
  const buys = (enterprise: PortfolioEnterprise) => (enterprise.seap?.buyerDirect ?? 0) > 0 || (enterprise.seap?.buyerAwards ?? 0) > 0
  return {
    filed: enterprises.filter((enterprise) => enterprise.financials.filed).length,
    netReported: withNet.length,
    loss: withNet.filter((enterprise) => Number(enterprise.financials.net) < 0).length,
    buyers: enterprises.filter(buys).length,
    buyersUnknown: enterprises.filter((enterprise) => !buys(enterprise) && (!enterprise.seap || enterprise.seap.buyerDirect === null || enterprise.seap.buyerAwards === null)).length,
    directSellers: enterprises.filter((enterprise) => (enterprise.seap?.supplierDirect ?? 0) > 0).length,
    directSellersUnknown: enterprises.filter((enterprise) => !enterprise.seap || enterprise.seap.supplierDirect === null).length,
  }
}
