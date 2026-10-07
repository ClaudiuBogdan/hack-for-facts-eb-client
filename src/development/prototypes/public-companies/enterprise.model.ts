import type { PublicEnterpriseAuthorityKind } from '@/features/public-enterprises/lib/hub-snapshot-types'
import { commaBelow } from '@/features/private-companies/lib/company-profile-model'
import type { AuthorityEntity, AuthorityRead, EnterpriseProfile, EnterpriseRead, IndicatorCell, SourceLane } from './enterprise.data'

/**
 * The enterprise page's model, pure: who controls the enterprise in each
 * source, what each source says its status is, and AMEPIP's indicators as
 * tables of the values as written. Nothing here merges two sources, rescales
 * a value or reads a missing cell as zero.
 */

// ─────────────────────────────────────────────────────────── control ──

export type ControlSource = 's1001' | 'json_apt'

export type ControlRow = {
  readonly key: string
  readonly source: ControlSource
  readonly authorityCui: string | null
  /** The source's own words; JSON-APT's HTML entities decoded, nothing else. */
  readonly name: string | null
  /** The authority's budget record's name, for a row whose source gave none. */
  readonly budgetName: string | null
  /** ANAF's level; JSON-APT reports none. */
  readonly level: 'central' | 'local' | null
  readonly kind: PublicEnterpriseAuthorityKind
  /** The enterprise's status in that list (S1001 only): „ACTIV", „INACTIV". */
  readonly statusInList: string | null
  readonly hasBudget: boolean
  /** The other enterprises the lists give this authority, by name; null when the read failed. */
  readonly peers: { readonly total: number; readonly others: readonly { readonly cui: string; readonly name: string | null }[] } | null
}

/** The JSON-APT blob writes some names with HTML entities (`&quot;`): text, not markup. */
export function decodeEntities(text: string): string {
  const named: Readonly<Record<string, string>> = { quot: '"', amp: '&', apos: "'", '#39': "'", lt: '<', gt: '>' }
  return text.replace(/&(quot|amp|apos|#39|lt|gt);/gu, (whole, entity: string) => named[entity] ?? whole)
}

/** The authority's kind, read off its own budget record (never its name): the hub generator's rule. */
export function authorityKind(entity: AuthorityEntity): PublicEnterpriseAuthorityKind {
  const type = entity?.reference?.entityType
  const territory = entity?.territory?.kind
  if (type === 'uat' && (territory === 'county' || territory === 'municipality' || territory === 'town' || territory === 'commune' || territory === 'sector')) return territory
  if (type === 'central_authority' || type === 'public_entity' || type === 'education') return type
  return 'unresolved'
}

function peersOf(read: AuthorityRead | undefined, self: string): ControlRow['peers'] {
  if (!read?.peers) return null
  const others = read.peers.items.filter((item) => item.cui !== self).map((item) => ({ cui: item.cui, name: item.organization?.name ?? null }))
  return { total: read.peers.total, others }
}

/** One row per control edge, ANAF's list first: two sources naming one authority stay two rows. */
export function controlRows(read: EnterpriseRead): readonly ControlRow[] {
  const edges = read.profile?.authorityEdges ?? []
  return [...edges]
    .sort((a, b) => (a.sourceFamily === b.sourceFamily ? 0 : a.sourceFamily === 's1001' ? -1 : 1))
    .map((edge, index) => {
      const authority = edge.authorityCui ? read.authorities[edge.authorityCui] : undefined
      return {
        key: `${edge.sourceFamily}-${edge.authorityCui ?? index}`,
        source: edge.sourceFamily,
        authorityCui: edge.authorityCui,
        name: edge.authorityName ? decodeEntities(edge.authorityName) : null,
        budgetName: authority?.entity?.organization?.name ?? null,
        level: edge.authorityLevel === 'central' || edge.authorityLevel === 'local' ? edge.authorityLevel : null,
        kind: authorityKind(authority?.entity ?? null),
        statusInList: edge.sourceFamily === 's1001' ? edge.enterpriseStatusRaw : null,
        hasBudget: authority?.entity?.budget?.presence === true,
        peers: edge.authorityCui ? peersOf(authority, read.cui) : null,
      }
    })
}

/** Whether the two sources name the same authority: compared by CUI, never by spelling. */
export function controlAgreement(rows: readonly ControlRow[]): 'none' | 'one' | 'same' | 'different' {
  const s1001 = rows.filter((row) => row.source === 's1001').map((row) => row.authorityCui)
  const apt = rows.filter((row) => row.source === 'json_apt').map((row) => row.authorityCui)
  if (s1001.length === 0 && apt.length === 0) return 'none'
  if (s1001.length === 0 || apt.length === 0) return 'one'
  return apt.every((cui) => s1001.includes(cui)) && s1001.every((cui) => apt.includes(cui)) ? 'same' : 'different'
}

/** One authority as the sources name it: two sources naming the same CUI are one group, each source kept. */
export type ControlGroup = { readonly key: string; readonly rows: readonly ControlRow[] }

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

/** The kinds a reader cannot tell from the name: which kind of local authority. A ministry's budget-record kind is not shown. */
export function shownKind(row: ControlRow): PublicEnterpriseAuthorityKind | null {
  return row.kind === 'county' || row.kind === 'municipality' || row.kind === 'town' || row.kind === 'commune' || row.kind === 'sector' ? row.kind : null
}

// ─────────────────────────────────────────────────────────── status ──

export type S1001State = { readonly listed: boolean; readonly raw: string | null }

/** The enterprise's status in ANAF's list, its own word. */
export function s1001State(profile: EnterpriseProfile | null): S1001State {
  const row = profile?.registryObservations.find((observation) => observation.sourceFamily === 's1001')
  return row ? { listed: true, raw: row.statusRaw } : { listed: false, raw: null }
}

/** AMEPIP's yearly register: the year and its own status words, oldest first. */
export function amepipYears(profile: EnterpriseProfile | null): readonly { readonly year: number; readonly status: string | null }[] {
  return (profile?.registryObservations ?? [])
    .filter((observation) => observation.sourceFamily === 'amepip_company_year' && observation.observedYear !== null)
    .map((observation) => ({ year: observation.observedYear!, status: observation.statusRaw ? commaBelow(observation.statusRaw) : null }))
    .sort((a, b) => a.year - b.year)
}

/** AMEPIP's years run together while their status words are the same: „2019–2024: faliment". */
export function amepipRuns(years: readonly { readonly year: number; readonly status: string | null }[]): readonly { readonly from: number; readonly to: number; readonly status: string | null }[] {
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

export function laneOf(profile: EnterpriseProfile | null, family: SourceLane['family']): SourceLane | null {
  return profile?.sources.find((source) => source.family === family) ?? null
}

// ─────────────────────────────────────────────────────── indicators ──

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
   * Checked against the statements (net margin, ROE and turnover growth equal
   * the statements' own ratios as fractions in 523 of 526 enterprise-years,
   * 2026-10-07). Market share and the form are not: they stay as written.
   */
  readonly fraction: boolean
  /** Exact decimal text by year; null for an empty cell. */
  readonly values: Readonly<Record<number, string | null>>
}

export type IndicatorTable = { readonly years: readonly number[]; readonly rows: readonly IndicatorRow[] }

/** A cell's value as written: the exact decimal of a number, the raw text of a text cell, null when empty. */
export function cellValue(cell: IndicatorCell): string | null {
  if (cell.valueKind === 'number') return cell.numericValue
  if (cell.valueKind === 'boolean') return cell.booleanValue === null ? null : String(cell.booleanValue)
  if (cell.valueKind === 'text') return cell.rawValue
  return null
}

/** AMEPIP's calculated ratios whose „%" was checked to be a fraction; market share was not (its largest value is 283,2). */
export function isCheckedFraction(sheet: string, code: string, unit: string | null): boolean {
  return sheet === 'Indicatori calculati' && isPercentUnit(unit) && code !== 'MS'
}

function tableOf(cells: readonly IndicatorCell[], years: readonly number[]): IndicatorTable | null {
  if (years.length === 0) return null
  const rows = new Map<string, { code: string; name: string; unit: string | null; values: Record<number, string | null> }>()
  for (const cell of cells) {
    const code = cell.kpiCode ?? cell.indicatorKey
    const row = rows.get(code) ?? { code, name: cell.indicatorName.replace(/\s+/gu, ' ').trim(), unit: cell.measureUnit, values: {} }
    if (years.includes(cell.year)) row.values[cell.year] = cellValue(cell)
    rows.set(code, row)
  }
  const ordered = [...rows.values()]
    .map((row) => ({ ...row, group: groupOf(row.code), fraction: isCheckedFraction(cells[0]?.sourceSheet ?? '', row.code, row.unit) }))
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

export function indicatorTables(cells: readonly IndicatorCell[]): IndicatorTables {
  const calculatedCells = cells.filter((cell) => cell.sourceSheet === 'Indicatori calculati')
  const formCells = cells.filter((cell) => cell.sourceSheet === 'Indicatori formular')
  const yearsWith = (list: readonly IndicatorCell[], keep: (cell: IndicatorCell) => boolean) =>
    [...new Set(list.filter((cell) => cellValue(cell) !== null && keep(cell)).map((cell) => cell.year))].sort((a, b) => a - b)
  const formYears = yearsWith(formCells, (cell) => !FORM_TRAP_KPIS.has(cell.kpiCode ?? ''))
  const trapYears = yearsWith(formCells, (cell) => FORM_TRAP_KPIS.has(cell.kpiCode ?? ''))
  return {
    calculated: tableOf(calculatedCells, yearsWith(calculatedCells, () => true)),
    form: tableOf(formCells, formYears),
    withheldFormYears: trapYears.filter((year) => !formYears.includes(year)),
  }
}

/** A row's values in the table's years, oldest first. */
export function rowValues(row: IndicatorRow, years: readonly number[]): readonly (string | null)[] {
  return years.map((year) => row.values[year] ?? null)
}

/** A value whose unit is „%" but which no percent scale fits both ways: the scale AMEPIP did not say (ask 11). */
export function isPercentUnit(unit: string | null): boolean {
  return unit !== null && unit.trim() === '%'
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

/** A cell as the table shows it: a checked fraction as a percent, any other value as written. */
export function displayValue(row: IndicatorRow, value: string, locale: string): string {
  return exactDecimal(row.fraction ? fractionToPercent(value) : value, locale)
}

// ────────────────────────────────────────────────────────── samples ──

/** Enterprises that cover the page's cases, for the prototype's picker. */
export const SAMPLES: readonly { readonly cui: string; readonly label: string; readonly note: string }[] = [
  { cui: '13267213', label: 'Hidroelectrica', note: 'central, AMEPIP complet' },
  { cui: '789401', label: 'Tursib', note: 'sursele numesc autorități diferite' },
  { cui: '10020943', label: 'ADPB', note: 'ANAF scrie sectorul fără număr' },
  { cui: '73452', label: 'Aeroportul Oradea', note: 'consiliu județean' },
  { cui: '9922624', label: 'Goscom Râșnov', note: 'activă la ANAF, faliment la AMEPIP' },
  { cui: '16041457', label: 'Ocolul Silvic Sebeș', note: 'regie, doar indicatori calculați' },
  { cui: '175', label: 'Infosistem', note: 'inactivă, fără bilanțuri' },
  { cui: '25252500', label: 'EXIM', note: 'nu e în lista ANAF, fără autoritate' },
  { cui: '1558391', label: '1558391', note: 'fără fișă de firmă' },
  { cui: '3251058', label: "Utilserv'96", note: 'istorică' },
]
