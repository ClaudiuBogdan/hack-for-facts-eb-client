import { t } from '@lingui/core/macro'
import { caenDivision, divisionLabel } from '@/features/private-companies/lib/caen-divisions'
import {
  DISSOLUTION_STATUSES,
  INSOLVENCY_STATUSES,
  STATUS_ACTIVE,
  STATUS_STRUCK_OFF,
} from '@/features/private-companies/lib/company-status-codes'
import { foldCountyName } from '@/features/private-companies/lib/county-names'
import { COMPANY_HUB_SNAPSHOT } from '@/features/private-companies/lib/hub-snapshot'
import { isReceiptFlow } from '@/features/private-companies/lib/public-money-display'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type { PrivateCompanyFinancialYear, PrivateCompanyProfile } from '@/schemas/private-company'
import { COMPANY_FIXTURES, type CompanyFixtureKey, type CompanyProcurementRead } from './company-page.fixtures'
import type { PaymentGrain } from './company-page.state'

/**
 * What the layouts draw, derived from one company's record: who it is in a
 * sentence, its years with the gaps kept, where it stands in the economy
 * (from the `/companies` snapshot), and the public money it received.
 *
 * Nothing here assumes a shape: a company may have no statement at all,
 * losses, a year with no turnover, no staff, no public money, contracts but
 * no direct purchases or the reverse, and any registry status. Each field is
 * null or empty when the record does not support it, and the parts render
 * nothing — or say so in one line — rather than a zero.
 */

export interface YearValue {
  readonly year: number
  /** Null for a year with no statement or no value: a gap, never a zero. */
  readonly value: number | null
}

export interface ActivityGroup {
  readonly division: string
  readonly label: string
  readonly activities: readonly { readonly code: string; readonly label: string }[]
}

export interface MoneyYear {
  readonly year: number
  readonly contracts: number
  readonly direct: number
  /** PNRR payments and subcontracts, budget execution: receipts outside SEAP. */
  readonly other: number
  readonly count: number
  /** Records of the year with no published amount: counted, never summed as zero. */
  readonly unvalued: number
}

export interface MoneyFlowSummary {
  readonly flowType: string
  /** Null when the source published no amount for the flow's records. */
  readonly total: number | null
  readonly count: number
  /** False for an obligation (a PNRR commitment), which is never added to what was received. */
  readonly receipt: boolean
}

/** Where the registry has the company: in business, or on its way out and how. */
export type StatusKind = 'active' | 'insolvency' | 'dissolution' | 'struck-off' | 'other'

/** The statements' size classes, as `/companies` counts them. */
export type SizeClass = 'none' | 'micro' | 'small' | 'medium' | 'large'

export interface CompanyPageModel {
  readonly profile: PrivateCompanyProfile
  readonly procurement: CompanyProcurementRead
  readonly displayName: string
  readonly legalFormName: string | null
  readonly status: { readonly kind: StatusKind; readonly label: string | null }
  readonly foundedYear: number | null
  /** `label`: the registered office as a reader writes it („Gherla, Cluj"). */
  readonly place: { readonly label: string | null; readonly county: string | null; readonly countyCode: string | null }
  /** `division`: the snapshot's division for it, null when the code is outside the Rev.2 divisions. */
  readonly mainActivity: { readonly code: string; readonly label: string; readonly division: string | null; readonly divisionLabel: string | null } | null
  /**
   * The authorised activities in the newest CAEN revision the registry lists,
   * by division; `mainListed`: the main activity is one of them.
   */
  readonly activities: { readonly revision: string | null; readonly total: number; readonly groups: readonly ActivityGroup[]; readonly mainListed: boolean }
  /** The newest statement; null when the company never filed one that was published. */
  readonly latest: PrivateCompanyFinancialYear | null
  /** The statement a year before the newest, when there is one. */
  readonly previous: PrivateCompanyFinancialYear | null
  /** The newest statement is older than the year before the snapshot's: the figures are old news. */
  readonly stale: boolean
  /** Every year from the first statement to the last, gaps included. */
  readonly span: readonly number[]
  readonly missingYears: readonly number[]
  readonly series: {
    readonly turnover: readonly YearValue[]
    readonly netResult: readonly YearValue[]
    readonly employees: readonly YearValue[]
  }
  /**
   * The last five years with a statement — not the last five calendar years:
   * a company that stopped filing still shows its last five.
   */
  readonly recent: {
    readonly years: readonly number[]
    readonly turnover: readonly (number | null)[]
    readonly netResult: readonly (number | null)[]
    readonly employees: readonly (number | null)[]
  }
  readonly lossYears: number
  readonly sizeClass: SizeClass | null
  /** Shares of the snapshot year's totals; each null when too small to say anything (under 1%). */
  readonly context: {
    readonly year: number
    readonly sectorTurnoverShare: number | null
    readonly sectorEmployeesShare: number | null
    readonly countyTurnoverShare: number | null
    readonly nationalTurnoverShare: number | null
  }
  readonly money: {
    /** Every flow the source reports, receipts first, largest first. */
    readonly flows: readonly MoneyFlowSummary[]
    /** The published amounts of every receipt, dated or not. */
    readonly received: number
    readonly receivedCount: number
    /** Receipt records with no published amount. */
    readonly unvaluedCount: number
    /** PNRR commitments: obligations entered into, never added to what was received. */
    readonly commitments: { readonly total: number; readonly count: number }
    readonly byYear: readonly MoneyYear[]
    /** Receipts the source recorded with no year. */
    readonly undated: { readonly total: number; readonly count: number; readonly unvalued: number }
    readonly firstYear: number | null
    readonly lastYear: number | null
    /** The newest year when the read stops inside it (`until`: its last month, `YYYY-MM`). */
    readonly partial: { readonly year: number; readonly until: string } | null
  }
  /** The SEAP population with records, contracts first; null when the company never supplied through SEAP. */
  readonly defaultGrain: PaymentGrain | null
  readonly grains: readonly PaymentGrain[]
}

/**
 * Profit less loss, a missing side counting as zero — ANAF writes a zero
 * profit beside a loss — and null only when neither side is reported.
 */
export function netResultOf(year: PrivateCompanyFinancialYear): number | null {
  if (year.netProfit === null && year.netLoss === null) return null
  return (year.netProfit ?? 0) - (year.netLoss ?? 0)
}

// ───────────────────────────────────────────────── names ──

function legalFormName(form: string | null): string | null {
  switch (form) {
    case null:
      return null
    case 'SA':
      return t`Societate pe acțiuni`
    case 'SRL':
      return t`Societate cu răspundere limitată`
    case 'SCS':
      return t`Societate în comandită simplă`
    case 'SNC':
      return t`Societate în nume colectiv`
    case 'SCA':
      return t`Societate în comandită pe acțiuni`
    case 'RA':
      return t`Regie autonomă`
    case 'PFA':
      return t`Persoană fizică autorizată`
    case 'II':
      return t`Întreprindere individuală`
    case 'IF':
      return t`Întreprindere familială`
    default:
      return form
  }
}

/** The registry's cedilla letters as the comma-below ones Romanian is written in („Bucureşti" → „București"). */
function commaBelow(text: string): string {
  return text.replace(/ş/gu, 'ș').replace(/Ş/gu, 'Ș').replace(/ţ/gu, 'ț').replace(/Ţ/gu, 'Ț')
}

/** Romanian function words, lower case inside a name („Compania Națională de Căi Ferate"). */
const FUNCTION_WORDS = new Set(['de', 'din', 'si', 'și', 'a', 'al', 'ale', 'la', 'pe', 'pentru', 'cu', 'in', 'în'])

/**
 * The registry writes names in capitals; a heading in capitals shouts. Words
 * become capitalised, with three generic exceptions that hold for any name:
 * a word of three letters or fewer stays in capitals (legal forms, initials
 * and acronyms: SA, SRL, ABC), a word with a digit, a dot or an ampersand
 * stays as written (S.R.L., 2016), and a function word goes lower case.
 * The exact legal name stays in the registry facts.
 */
export function displayCompanyName(legalName: string): string {
  return commaBelow(legalName)
    .split(/(\s+|-)/u)
    .map((word, index) => {
      if (word === '' || /^\s+$|^-$/u.test(word)) return word
      const lower = word.toLocaleLowerCase('ro-RO')
      if (index > 0 && FUNCTION_WORDS.has(lower)) return lower
      if (/[\d.&]/u.test(word)) return word
      const letters = word.replace(/[^\p{L}]/gu, '')
      if (letters.length <= 3) return word
      return lower.replace(/\p{L}/u, (first) => first.toLocaleUpperCase('ro-RO'))
    })
    .join('')
}

/**
 * „Municipiul Botoşani" in „Botoşani" → „Botoșani"; „Municipiul Gherla" in
 * „Cluj" → „Gherla, Cluj"; „Bucureşti Sectorul 1" → „București, Sectorul 1".
 */
function placeLabel(locality: string | null, county: string | null): string | null {
  const region = county ? commaBelow(county) : null
  const town = locality
    ? commaBelow(locality)
        .replace(/^(Municipiul|Orașul|Oraș)\s+/u, '')
        .replace(/^(București)\s+(Sectorul\s+\d)$/u, '$1, $2')
    : null
  if (!town) return region
  if (!region || town.startsWith(region)) return town
  return `${town}, ${region}`
}

function countyCodeOf(name: string | null): string | null {
  if (!name) return null
  const folded = foldCountyName(name)
  return ROMANIA_COUNTIES.find((county) => foldCountyName(county.nameRo) === folded)?.code ?? null
}

function statusOf(profile: PrivateCompanyProfile): CompanyPageModel['status'] {
  const code = profile.status?.code ?? null
  const label = profile.status?.label ?? null
  if (code === STATUS_ACTIVE) return { kind: 'active', label }
  if (code === STATUS_STRUCK_OFF) return { kind: 'struck-off', label }
  if (code && (INSOLVENCY_STATUSES as readonly string[]).includes(code)) return { kind: 'insolvency', label }
  if (code && (DISSOLUTION_STATUSES as readonly string[]).includes(code)) return { kind: 'dissolution', label }
  return { kind: 'other', label }
}

// ──────────────────────────────────────────── activities ──

const REVISION_ORDER = ['rev3', 'rev2', 'rev1']

function activityGroups(profile: PrivateCompanyProfile): Omit<CompanyPageModel['activities'], 'mainListed'> {
  const onrc = profile.caenActivities.filter((activity) => activity.source === 'onrc' && activity.rev)
  const revision = REVISION_ORDER.find((rev) => onrc.some((activity) => activity.rev === rev)) ?? null
  const current = onrc.filter((activity) => activity.rev === revision)
  const byDivision = new Map<string, { code: string; label: string }[]>()
  for (const activity of current) {
    const division = activity.code.slice(0, 2)
    const list = byDivision.get(division) ?? []
    list.push({ code: activity.code, label: activity.label ?? activity.code })
    byDivision.set(division, list)
  }
  const groups = [...byDivision.entries()]
    .map(([division, activities]) => ({ division, label: divisionLabel(division), activities: activities.sort((a, b) => a.code.localeCompare(b.code)) }))
    .sort((a, b) => b.activities.length - a.activities.length || a.division.localeCompare(b.division))
  return { revision, total: current.length, groups }
}

/**
 * The division a main activity counts under in the `/companies` snapshot:
 * ANAF's codes mix CAEN revisions, and the snapshot keeps a class's
 * division except Rev.3 vehicle repair (95.3x), which it moves back to 45.
 * A code outside the Rev.2 divisions has no sector to compare with.
 */
function snapshotDivision(code: string): string | null {
  const division = code.startsWith('953') ? '45' : code.slice(0, 2)
  return caenDivision(division) ? division : null
}

function mainActivity(profile: PrivateCompanyProfile): CompanyPageModel['mainActivity'] {
  const code = profile.fiscal.fiscalCaen?.code ?? null
  if (!code) return null
  const named = profile.caenActivities.find((activity) => activity.code === code && activity.label)
  const division = snapshotDivision(code)
  return { code, label: named?.label ?? code, division, divisionLabel: division ? divisionLabel(division) : null }
}

// ────────────────────────────────────────── public money ──

/** Which bar a receipt flow is drawn in: the two SEAP instruments apart, every other receipt together. */
function bucketOf(flowType: string): 'contracts' | 'direct' | 'other' {
  return flowType === 'procurement_contract' ? 'contracts' : flowType === 'direct_acquisition' ? 'direct' : 'other'
}

/** A row's amount when the source published one; a row of records with no amount (null, or zero for a count) is unvalued. */
function valued(totalRon: number | null, count: number): number | null {
  return totalRon === null || (totalRon <= 0 && count > 0) ? null : totalRon
}

/**
 * The public money a company received, kept as the source split it: every
 * receipt flow by its own name (never folded into „contracts"), the records
 * with no published amount counted rather than summed as zero, the records
 * with no year kept apart from the dated ones, and PNRR commitments —
 * obligations, not payments — outside every total.
 */
function moneyModel(profile: PrivateCompanyProfile, procurement: CompanyProcurementRead): CompanyPageModel['money'] {
  const money = profile.publicMoney
  const flows: MoneyFlowSummary[] = (money?.byFlowType ?? [])
    .map((row) => ({ flowType: row.flowType, total: valued(row.totalRon, row.count), count: row.count, receipt: isReceiptFlow(row.flowType) }))
    .sort((a, b) => Number(b.receipt) - Number(a.receipt) || (b.total ?? -1) - (a.total ?? -1))

  const years = new Map<number, { contracts: number; direct: number; other: number; count: number; unvalued: number }>()
  const undated = { total: 0, count: 0, unvalued: 0 }
  let unvaluedCount = 0
  for (const row of money?.byYear ?? []) {
    if (!isReceiptFlow(row.flowType)) continue
    const amount = valued(row.totalRon, row.count)
    if (amount === null) unvaluedCount += row.count
    if (row.year === null) {
      undated.total += amount ?? 0
      undated.count += row.count
      if (amount === null) undated.unvalued += row.count
      continue
    }
    const entry = years.get(row.year) ?? { contracts: 0, direct: 0, other: 0, count: 0, unvalued: 0 }
    entry[bucketOf(row.flowType)] += amount ?? 0
    entry.count += row.count
    if (amount === null) entry.unvalued += row.count
    years.set(row.year, entry)
  }
  const known = [...years.keys()].sort((a, b) => a - b)
  const firstYear = known[0] ?? null
  const lastYear = known[known.length - 1] ?? null
  const byYear: MoneyYear[] =
    firstYear === null || lastYear === null
      ? []
      : Array.from({ length: lastYear - firstYear + 1 }, (_, index) => {
          const year = firstYear + index
          const entry = years.get(year)
          return { year, contracts: entry?.contracts ?? 0, direct: entry?.direct ?? 0, other: entry?.other ?? 0, count: entry?.count ?? 0, unvalued: entry?.unvalued ?? 0 }
        })

  // The read's last month, when it cuts the newest year: that year's bar is a part of a year.
  const cut = procurement.window.to
  const cutYear = cut ? Number(cut.slice(0, 4)) : null
  const partial = cut && cutYear === lastYear && !cut.endsWith('-12') ? { year: cutYear, until: cut } : null

  const receipts = flows.filter((flow) => flow.receipt)
  const commitments = flows.filter((flow) => flow.flowType === 'pnrr_commitment')
  return {
    flows,
    received: receipts.reduce((sum, flow) => sum + (flow.total ?? 0), 0),
    receivedCount: receipts.reduce((sum, flow) => sum + flow.count, 0),
    unvaluedCount,
    commitments: { total: commitments.reduce((sum, flow) => sum + (flow.total ?? 0), 0), count: commitments.reduce((sum, flow) => sum + flow.count, 0) },
    byYear,
    undated,
    firstYear,
    lastYear,
    partial,
  }
}

// ───────────────────────────────────────────────── model ──

const SHARE_FLOOR = 0.01

/** How many statement years the compact trend in the head shows. */
const RECENT_YEARS = 5

export function sizeClassOf(employees: number | null): SizeClass | null {
  if (employees === null) return null
  if (employees === 0) return 'none'
  if (employees < 10) return 'micro'
  if (employees < 50) return 'small'
  if (employees < 250) return 'medium'
  return 'large'
}

export function buildCompanyPageModel(profile: PrivateCompanyProfile, procurement: CompanyProcurementRead): CompanyPageModel {
  const years = [...profile.financials].sort((a, b) => a.fiscalYear - b.fiscalYear)
  const latest = years[years.length - 1] ?? null
  const previous = latest ? (years.find((year) => year.fiscalYear === latest.fiscalYear - 1) ?? null) : null
  const first = years[0]?.fiscalYear ?? null
  const span = latest && first !== null ? Array.from({ length: latest.fiscalYear - first + 1 }, (_, index) => first + index) : []
  const byYear = new Map(years.map((year) => [year.fiscalYear, year]))
  const seriesOf = (read: (year: PrivateCompanyFinancialYear) => number | null): YearValue[] =>
    span.map((year) => {
      const entry = byYear.get(year)
      return { year, value: entry ? read(entry) : null }
    })
  const employees = seriesOf((year) => year.employees)
  const netResult = seriesOf(netResultOf)

  const snapshot = COMPANY_HUB_SNAPSHOT
  const activity = mainActivity(profile)
  const activities = activityGroups(profile)
  const sector = activity?.division ? snapshot.sectors.find((row) => row.division === activity.division) : undefined
  const countyName = profile.geography?.countyName ?? profile.address.county
  const countyCode = countyCodeOf(countyName)
  const county = countyCode ? snapshot.counties.find((row) => row.code === countyCode) : undefined
  const snapshotYear = byYear.get(snapshot.fiscalYear)
  const share = (part: number | null | undefined, whole: number | undefined) => {
    if (part === null || part === undefined || !whole) return null
    const value = part / whole
    return value >= SHARE_FLOOR ? value : null
  }
  const founded = profile.registrationDate ? Number(profile.registrationDate.slice(0, 4)) : null
  const money = moneyModel(profile, procurement)
  const recentYears = years.slice(-RECENT_YEARS)
  const grains: PaymentGrain[] = [
    ...(procurement.contracts.count > 0 ? (['contracte'] as const) : []),
    ...(procurement.directAcquisitions.count > 0 ? (['achizitii-directe'] as const) : []),
  ]

  return {
    profile,
    procurement,
    displayName: displayCompanyName(profile.legalName),
    legalFormName: legalFormName(profile.legalForm),
    status: statusOf(profile),
    foundedYear: founded,
    place: { label: placeLabel(profile.geography?.uatName ?? profile.address.locality, countyName), county: countyName ? commaBelow(countyName) : null, countyCode },
    mainActivity: activity,
    activities: {
      ...activities,
      mainListed: activity !== null && activities.groups.some((group) => group.activities.some((entry) => entry.code === activity.code)),
    },
    latest,
    previous,
    stale: latest !== null && latest.fiscalYear < snapshot.fiscalYear - 1,
    span,
    missingYears: span.filter((year) => !byYear.has(year)),
    series: { turnover: seriesOf((year) => year.turnover), netResult, employees },
    recent: {
      years: recentYears.map((year) => year.fiscalYear),
      turnover: recentYears.map((year) => year.turnover),
      netResult: recentYears.map(netResultOf),
      employees: recentYears.map((year) => year.employees),
    },
    lossYears: netResult.filter((point) => point.value !== null && point.value < 0).length,
    sizeClass: sizeClassOf(latest?.employees ?? null),
    context: {
      year: snapshot.fiscalYear,
      sectorTurnoverShare: share(snapshotYear?.turnover, sector?.turnover),
      sectorEmployeesShare: share(snapshotYear?.employees, sector?.employees),
      countyTurnoverShare: share(snapshotYear?.turnover, county?.turnover),
      nationalTurnoverShare: share(snapshotYear?.turnover, snapshot.national.turnover),
    },
    money,
    defaultGrain: grains[0] ?? null,
    grains,
  }
}

/**
 * The model for the company in `?firma=`, built at render: its labels (legal
 * form, divisions) are messages, so they resolve in the page's language
 * rather than once at module load.
 */
export function useCompanyPageModel(key: CompanyFixtureKey): CompanyPageModel {
  const fixture = COMPANY_FIXTURES[key]
  return buildCompanyPageModel(fixture.profile, fixture.procurement)
}
