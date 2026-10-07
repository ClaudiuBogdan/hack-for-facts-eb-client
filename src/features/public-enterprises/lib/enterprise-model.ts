import { commaBelow } from '@/features/private-companies/lib/company-profile-model'
import type {
  PublicEnterpriseAuthorityEntity,
  PublicEnterpriseIndicator,
  PublicEnterpriseProfile,
  PublicEnterpriseRead,
  PublicEnterpriseSource,
} from '@/schemas/public-enterprise-profile'
import type { PublicEnterpriseAuthorityKind } from './hub-snapshot-types'

/**
 * `/public-enterprises/$cui`'s model, pure (promoted from the prototype
 * `public-companies/enterprise`): who controls the enterprise in each source,
 * what each source says its status is, and AMEPIP's indicators as tables.
 * Nothing here merges two sources, reads a missing cell as zero, or rescales
 * a value whose scale was not checked.
 */

// ─────────────────────────────────────────────────────────── control ──

export type ControlSource = 's1001' | 'json_apt'

export type ControlRow = {
  readonly key: string
  readonly source: ControlSource
  readonly authorityCui: string | null
  /** The source's own words, its HTML entities decoded; null when it gave none. */
  readonly name: string | null
  /** The authority's budget record's name, for a row whose source gave none. */
  readonly budgetName: string | null
  /** ANAF's level; JSON-APT reports none. */
  readonly level: 'central' | 'local' | null
  /** From the authority's own budget record; `unresolved` without one, or when it was not read. */
  readonly kind: PublicEnterpriseAuthorityKind
  /** The enterprise's status in ANAF's list (S1001 rows only), its own word. */
  readonly statusInList: string | null
  readonly hasBudget: boolean
  /** The other enterprises the lists give this authority; null when they were not read. */
  readonly peers: { readonly total: number; readonly others: readonly { readonly cui: string; readonly name: string | null }[] } | null
}

/** One authority as the sources name it: two sources naming the same CUI are one group, each source kept. */
export type ControlGroup = { readonly key: string; readonly rows: readonly ControlRow[] }

const NAMED_ENTITIES: Readonly<Record<string, string>> = { quot: '"', amp: '&', apos: "'", '#39': "'", lt: '<', gt: '>' }

/** The JSON-APT blob writes some names with HTML entities (`&quot;`): text, not markup. */
export function decodeEntities(text: string): string {
  return text.replace(/&(quot|amp|apos|#39|lt|gt);/gu, (whole, entity: string) => NAMED_ENTITIES[entity] ?? whole)
}

const LOCAL_KINDS: ReadonlySet<string> = new Set(['county', 'municipality', 'town', 'commune', 'sector'])
const CENTRAL_KINDS: ReadonlySet<string> = new Set(['central_authority', 'public_entity', 'education'])

/** The authority's kind, read off its own budget record (never its name): the hub generator's rule. */
export function authorityKind(entity: PublicEnterpriseAuthorityEntity): PublicEnterpriseAuthorityKind {
  const type = entity?.reference?.entityType ?? null
  const territory = entity?.territory?.kind ?? null
  if (type === 'uat' && territory && LOCAL_KINDS.has(territory)) return territory as PublicEnterpriseAuthorityKind
  if (type && CENTRAL_KINDS.has(type)) return type as PublicEnterpriseAuthorityKind
  return 'unresolved'
}

/** A name the API fills with the CUI itself when it has none is no name. */
function realName(name: string | null | undefined, cui: string | null): string | null {
  const trimmed = name?.trim() ?? ''
  return trimmed === '' || trimmed === cui ? null : trimmed
}

function isControlSource(family: string): family is ControlSource {
  return family === 's1001' || family === 'json_apt'
}

/** One row per control edge, ANAF's list first; an edge from a source this page does not know is left out. */
export function controlRows(read: PublicEnterpriseRead): readonly ControlRow[] {
  const edges = (read.profile?.authorityEdges ?? []).filter((edge) => isControlSource(edge.sourceFamily))
  return [...edges]
    .sort((a, b) => (a.sourceFamily === b.sourceFamily ? 0 : a.sourceFamily === 's1001' ? -1 : 1))
    .map((edge, index) => {
      const source = edge.sourceFamily as ControlSource
      const authority = edge.authorityCui ? read.authorities?.[edge.authorityCui] : undefined
      const others = authority ? authority.peers.items.filter((item) => item.cui !== read.cui) : []
      return {
        key: `${source}-${edge.authorityCui ?? index}`,
        source,
        authorityCui: edge.authorityCui,
        name: realName(edge.authorityName ? decodeEntities(edge.authorityName) : null, edge.authorityCui),
        budgetName: realName(authority?.entity?.organization?.name, edge.authorityCui),
        level: edge.authorityLevel === 'central' || edge.authorityLevel === 'local' ? edge.authorityLevel : null,
        kind: authorityKind(authority?.entity ?? null),
        statusInList: source === 's1001' ? edge.enterpriseStatusRaw : null,
        hasBudget: authority?.entity?.budget?.presence === true,
        peers: authority ? { total: authority.peers.total, others: others.map((item) => ({ cui: item.cui, name: realName(item.organization?.name, item.cui) })) } : null,
      }
    })
}

/** The edges grouped by authority CUI, in the rows' order: ANAF's list's authority first. */
export function controlGroups(rows: readonly ControlRow[]): readonly ControlGroup[] {
  const groups: { key: string; rows: ControlRow[] }[] = []
  for (const row of rows) {
    const group = row.authorityCui ? groups.find((entry) => entry.key === row.authorityCui) : undefined
    if (group) group.rows.push(row)
    else groups.push({ key: row.authorityCui ?? row.key, rows: [row] })
  }
  return groups
}

/** Two rows name one authority only when both carry its CUI and it is the same: a missing CUI matches nothing. */
export function sameAuthority(a: ControlRow, b: ControlRow): boolean {
  return a.authorityCui !== null && a.authorityCui === b.authorityCui
}

/** Whether the two sources name the same authorities: compared by known CUIs, never by spelling. */
export function controlAgreement(rows: readonly ControlRow[]): 'none' | 'one' | 'same' | 'different' {
  const s1001 = rows.filter((row) => row.source === 's1001')
  const apt = rows.filter((row) => row.source === 'json_apt')
  if (s1001.length === 0 && apt.length === 0) return 'none'
  if (s1001.length === 0 || apt.length === 0) return 'one'
  const covered = (from: readonly ControlRow[], to: readonly ControlRow[]) => from.every((row) => to.some((other) => sameAuthority(row, other)))
  return covered(apt, s1001) && covered(s1001, apt) ? 'same' : 'different'
}

/** The kinds a reader cannot tell from the name: which kind of local authority. A ministry's budget-record kind misleads as a caption. */
export function shownKind(row: ControlRow): PublicEnterpriseAuthorityKind | null {
  return LOCAL_KINDS.has(row.kind) ? row.kind : null
}

// ─────────────────────────────────────────────────────────── status ──

export type S1001State = { readonly listed: boolean; readonly raw: string | null }

/** The enterprise's status in ANAF's list, its own word. */
export function s1001State(profile: PublicEnterpriseProfile | null): S1001State {
  const row = profile?.registryObservations.find((observation) => observation.sourceFamily === 's1001')
  return row ? { listed: true, raw: row.statusRaw } : { listed: false, raw: null }
}

export type AmepipYear = { readonly year: number; readonly status: string | null }

/** AMEPIP's yearly register: each year and its own status words, oldest first. */
export function amepipYears(profile: PublicEnterpriseProfile | null): readonly AmepipYear[] {
  return (profile?.registryObservations ?? [])
    .flatMap((observation) =>
      observation.sourceFamily === 'amepip_company_year' && observation.observedYear !== null
        ? [{ year: observation.observedYear, status: observation.statusRaw?.trim() ? commaBelow(observation.statusRaw.trim()) : null }]
        : [],
    )
    .sort((a, b) => a.year - b.year)
}

/** The years AMEPIP has a form row for the enterprise (its form group), oldest first. */
export function amepipFormYears(profile: PublicEnterpriseProfile | null): readonly number[] {
  const years = (profile?.registryObservations ?? []).flatMap((observation) =>
    observation.sourceFamily === 'amepip_form_group' && observation.observedYear !== null ? [observation.observedYear] : [],
  )
  return [...new Set(years)].sort((a, b) => a - b)
}

/** AMEPIP's years run together while their words are the same: „2019–2024: faliment". */
export function amepipRuns(years: readonly AmepipYear[]): readonly { readonly from: number; readonly to: number; readonly status: string | null }[] {
  const runs: { from: number; to: number; status: string | null }[] = []
  for (const entry of years) {
    const last = runs[runs.length - 1]
    if (last && last.to === entry.year - 1 && last.status === entry.status) last.to = entry.year
    else runs.push({ from: entry.year, to: entry.year, status: entry.status })
  }
  return runs
}

/** AMEPIP's own word for a company in business. */
export function isFunctioning(status: string | null): boolean {
  return status !== null && /^\s*func[țţ]iune\s*$/iu.test(status)
}

export function laneOf(profile: PublicEnterpriseProfile | null, family: string): PublicEnterpriseSource | null {
  return profile?.sources.find((source) => source.family === family) ?? null
}

/** The sources the page reads. */
export const PAGE_LANES = ['s1001', 'amepip', 'json_apt'] as const
export type PageLane = (typeof PAGE_LANES)[number]

/**
 * A source the API reports unavailable: what it would say is unread, never
 * „none". The API serves the three lanes always, unavailable ones included.
 */
export function isLaneDown(profile: PublicEnterpriseProfile | null, family: PageLane): boolean {
  return laneOf(profile, family)?.laneStatus === 'unavailable'
}

export function downLanes(profile: PublicEnterpriseProfile | null): readonly PageLane[] {
  return PAGE_LANES.filter((family) => isLaneDown(profile, family))
}

// ─────────────────────────────────────────────────────── indicators ──

export const CALCULATED_SHEET = 'Indicatori calculati'
export const FORM_SHEET = 'Indicatori formular'

/** The form KPIs AMEPIP fills even in a year with no form: their 0 may be an empty cell (design note §12.3, ask 9). */
export const FORM_TRAP_KPIS: ReadonlySet<string> = new Set(['FIN-DP', 'FIN-RCC', 'FIN-RCCD'])

export type IndicatorGroupKey = 'finance' | 'governance' | 'people' | 'gender' | 'environment' | 'innovation' | 'clients' | 'other'

/** A form KPI's group, by the source's own code prefix. */
export function groupOf(code: string): IndicatorGroupKey {
  if (code.startsWith('FIN-') || code === 'MS') return 'finance'
  if (code.startsWith('GC_')) return 'governance'
  if (code.startsWith('W_') || code.startsWith('EMP_')) return 'people'
  if (code.startsWith('GEI_')) return 'gender'
  if (code === 'ENG' || code.startsWith('EDA')) return 'environment'
  if (code.startsWith('INV_')) return 'innovation'
  if (code.startsWith('CLT_')) return 'clients'
  return 'other'
}

const GROUP_ORDER: readonly IndicatorGroupKey[] = ['finance', 'governance', 'people', 'gender', 'environment', 'innovation', 'clients', 'other']

export type IndicatorRow = {
  readonly code: string
  readonly name: string
  readonly unit: string | null
  readonly group: IndicatorGroupKey
  /**
   * A ratio AMEPIP labels „%" but writes as a fraction: shown as a percent.
   * Only the ratios checked against the statements (`CHECKED_FRACTIONS`);
   * every other „%" stays as written.
   */
  readonly fraction: boolean
  /** Exact decimal text by year; null for an empty cell. */
  readonly values: Readonly<Record<number, string | null>>
}

export type IndicatorTable = { readonly years: readonly number[]; readonly rows: readonly IndicatorRow[] }

export function isPercentUnit(unit: string | null): boolean {
  return unit !== null && unit.trim() === '%'
}

/**
 * The calculated ratios whose „%" was checked to be a fraction: each equals
 * the statements' own ratio as a fraction (net ÷ turnover, net ÷ equity, net ÷
 * total assets, turnover and profit growth) in 809 of 818 enterprise-years
 * (40 enterprises, 2020–2024; design note §12.6). Market share (its largest
 * value is 283,2) and the operating margin (the statements carry no operating
 * result) could not be checked: they stay as written, as does the form.
 */
export const CHECKED_FRACTIONS: ReadonlySet<string> = new Set(['FIN-MNP', 'FIN-ROE', 'FIN-ROA', 'FIN-RCCA', 'FIN-RCP'])

export function isCheckedFraction(sheet: string, code: string, unit: string | null): boolean {
  return sheet === CALCULATED_SHEET && isPercentUnit(unit) && CHECKED_FRACTIONS.has(code)
}

/** A cell's value as written: the exact decimal of a number, the raw text of anything else, null when empty. */
export function cellValue(cell: PublicEnterpriseIndicator): string | null {
  switch (cell.valueKind) {
    case 'empty':
      return null
    case 'number':
      return cell.numericValue
    case 'boolean':
      // The cell as written: a reader's word for true or false is the source's, not ours.
      return cell.rawValue ?? (cell.booleanValue === null ? null : String(cell.booleanValue))
    default:
      // Text, or a kind the API adds later: its raw cell, as written.
      return cell.rawValue
  }
}

function tableOf(cells: readonly PublicEnterpriseIndicator[], sheet: string, years: readonly number[]): IndicatorTable | null {
  if (years.length === 0) return null
  const rows = new Map<string, { code: string; name: string; unit: string | null; values: Record<number, string | null> }>()
  for (const cell of cells) {
    const code = cell.kpiCode ?? cell.indicatorKey
    const row = rows.get(code) ?? { code, name: cell.indicatorName.replace(/\s+/gu, ' ').trim(), unit: cell.measureUnit?.trim() || null, values: {} }
    if (years.includes(cell.year)) row.values[cell.year] = cellValue(cell)
    rows.set(code, row)
  }
  const ordered = [...rows.values()]
    .map((row) => ({ ...row, group: groupOf(row.code), fraction: isCheckedFraction(sheet, row.code, row.unit) }))
    .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name, 'ro'))
  return { years, rows: ordered }
}

export type IndicatorTables = {
  /** AMEPIP's ratios („Indicatori calculati"), every year with a value. */
  readonly calculated: IndicatorTable | null
  /** The form („Indicatori formular"), only the years with a form filled in. */
  readonly form: IndicatorTable | null
  /** Years whose only form values are the three trap KPIs: not shown. */
  readonly withheldFormYears: readonly number[]
}

export function indicatorTables(cells: readonly PublicEnterpriseIndicator[]): IndicatorTables {
  const calculatedCells = cells.filter((cell) => cell.sourceSheet === CALCULATED_SHEET)
  const formCells = cells.filter((cell) => cell.sourceSheet === FORM_SHEET)
  const yearsWith = (list: readonly PublicEnterpriseIndicator[], keep: (cell: PublicEnterpriseIndicator) => boolean) =>
    [...new Set(list.filter((cell) => cellValue(cell) !== null && keep(cell)).map((cell) => cell.year))].sort((a, b) => a - b)
  const formYears = yearsWith(formCells, (cell) => !FORM_TRAP_KPIS.has(cell.kpiCode ?? ''))
  const trapYears = yearsWith(formCells, (cell) => FORM_TRAP_KPIS.has(cell.kpiCode ?? ''))
  return {
    calculated: tableOf(calculatedCells, CALCULATED_SHEET, yearsWith(calculatedCells, () => true)),
    form: tableOf(formCells, FORM_SHEET, formYears),
    withheldFormYears: trapYears.filter((year) => !formYears.includes(year)),
  }
}

/** A row's value in one year: null for an empty or absent cell. */
export function valueIn(row: IndicatorRow, year: number): string | null {
  return row.values[year] ?? null
}

/** The board panel: the newest form's answers on the board and the people, else the newest ratios. */
export const BOARD_KPIS: readonly string[] = ['W_TE', 'GC_MEET', 'GC_IND', 'GC_GEI', 'GC_BEN', 'FIN-DP']
export const RATIO_KPIS: readonly string[] = ['FIN-ROE', 'FIN-MNP', 'FIN-RLC', 'FIN-LEV']

export type BoardPanel = { readonly kind: 'form' | 'calculated'; readonly year: number; readonly rows: readonly IndicatorRow[] }

export function boardPanel(tables: IndicatorTables): BoardPanel | null {
  const pick = (table: IndicatorTable, codes: readonly string[]) =>
    codes.flatMap((code) => {
      const row = table.rows.find((entry) => entry.code === code)
      return row ? [row] : []
    })
  for (const [kind, table, codes] of [
    ['form', tables.form, BOARD_KPIS],
    ['calculated', tables.calculated, RATIO_KPIS],
  ] as const) {
    if (!table) continue
    const year = table.years[table.years.length - 1]
    const rows = year === undefined ? [] : pick(table, codes)
    if (year !== undefined && rows.some((row) => valueIn(row, year) !== null)) return { kind, year, rows }
  }
  return null
}

/** A fraction's exact decimal text as a percent: the point moved two places, no digit lost or rounded. */
export function fractionToPercent(text: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/u.exec(text.trim())
  if (!match) return text
  const [, sign = '', whole = '', fraction = ''] = match
  const padded = fraction.padEnd(2, '0')
  const integer = `${whole}${padded.slice(0, 2)}`.replace(/^0+(?=\d)/u, '')
  const rest = padded.slice(2)
  const value = rest ? `${integer}.${rest}` : integer
  return sign && /[1-9]/u.test(value) ? `-${value}` : value
}

/**
 * Exact decimal text for a reader: the integer part grouped, the decimal
 * separator localised, every digit kept. Text that is not a plain decimal is
 * returned as written.
 */
export function exactDecimal(text: string, locale: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/u.exec(text.trim())
  if (!match) return text
  const [, sign = '', whole = '', fraction] = match
  const group = locale === 'en' ? ',' : '.'
  const point = locale === 'en' ? '.' : ','
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/gu, group)
  return `${sign === '-' ? '−' : ''}${grouped}${fraction ? `${point}${fraction}` : ''}`
}

/** A cell as the page shows it: a checked fraction as a percent, any other value as written. */
export function displayValue(row: IndicatorRow, value: string, locale: string): string {
  return exactDecimal(row.fraction ? fractionToPercent(value) : value, locale)
}
