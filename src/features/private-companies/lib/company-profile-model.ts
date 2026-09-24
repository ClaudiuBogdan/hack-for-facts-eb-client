import { t } from '@lingui/core/macro'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type { PrivateCompanyFinancialYear, PrivateCompanyProfile } from '@/schemas/private-company'
import { caenDivision, divisionLabel } from './caen-divisions'
import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE, STATUS_STRUCK_OFF } from './company-status-codes'
import { foldCountyName } from './county-names'
import { COMPANY_HUB_SNAPSHOT } from './hub-snapshot'
import type { CompanyHubSnapshot } from './hub-snapshot-types'
import { isReceiptFlow } from './public-money-display'

/**
 * What the company profile draws, derived from the company's record: who it
 * is in a sentence, its years with the gaps kept, where it stands in the
 * economy (from the `/companies` snapshot), and the public money it received.
 *
 * Nothing here assumes a shape: a company may have no statement at all,
 * losses, a year with no turnover, no staff, no public money, and any registry
 * status. Each field is null or empty when the record does not support it, and
 * the page renders nothing — or says so in one line — rather than a zero.
 *
 * Labels (legal form, divisions) are messages, so the model is built at render
 * and resolves in the page's language.
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

export interface CompanyProfileModel {
  readonly profile: PrivateCompanyProfile
  readonly displayName: string
  readonly legalFormName: string | null
  readonly status: { readonly kind: StatusKind; readonly label: string | null }
  readonly foundedYear: number | null
  /** `label`: the registered office as a reader writes it („Gherla, Cluj"). */
  readonly place: { readonly label: string | null; readonly county: string | null; readonly countyCode: string | null }
  /** `division`: the snapshot's division for it, null when the code is outside the Rev.2 divisions. */
  readonly mainActivity: {
    readonly code: string
    readonly label: string
    readonly division: string | null
    readonly divisionLabel: string | null
  } | null
  /** The authorised activities in the newest CAEN revision the registry lists, by division. */
  readonly activities: { readonly revision: string | null; readonly total: number; readonly groups: readonly ActivityGroup[] }
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
    /**
     * The newest year of money when it is the calendar year in progress: its
     * bar is part of a year and must not read as a fall. Only the calendar can
     * say so — the month of a company's newest record is when it last won
     * something, not where the source stops.
     */
    readonly openYear: number | null
  }
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
export function commaBelow(text: string): string {
  return text.replace(/ş/gu, 'ș').replace(/Ş/gu, 'Ș').replace(/ţ/gu, 'ț').replace(/Ţ/gu, 'Ț')
}

/** Romanian function words, lower case inside a name („Compania Națională de Căi Ferate"). */
const FUNCTION_WORDS = new Set(['de', 'din', 'si', 'și', 'a', 'al', 'ale', 'la', 'pe', 'pentru', 'cu', 'in', 'în'])

/**
 * The registry writes names in capitals; a heading in capitals shouts. Words
 * become capitalised, with three generic exceptions that hold for any name:
 * a word of three letters or fewer stays in capitals (legal forms, initials
 * and acronyms: SA, SRL, ABC), a word with a digit, a dot or an ampersand
 * stays as written (S.R.L., 2016), and a function word goes lower case. The
 * exact legal name stays in the registry facts.
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
export function placeLabel(locality: string | null, county: string | null): string | null {
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

function statusOf(profile: PrivateCompanyProfile): CompanyProfileModel['status'] {
  const code = profile.status?.code ?? null
  const label = profile.status?.label ? commaBelow(profile.status.label) : null
  if (code === STATUS_ACTIVE) return { kind: 'active', label }
  if (code === STATUS_STRUCK_OFF) return { kind: 'struck-off', label }
  if (code && (INSOLVENCY_STATUSES as readonly string[]).includes(code)) return { kind: 'insolvency', label }
  if (code && (DISSOLUTION_STATUSES as readonly string[]).includes(code)) return { kind: 'dissolution', label }
  return { kind: 'other', label }
}

// ──────────────────────────────────────────── activities ──

const REVISION_ORDER = ['rev3', 'rev2', 'rev1']

function activityGroups(profile: PrivateCompanyProfile): CompanyProfileModel['activities'] {
  const onrc = profile.caenActivities.filter((activity) => activity.source === 'onrc' && activity.rev)
  const revision = REVISION_ORDER.find((rev) => onrc.some((activity) => activity.rev === rev)) ?? null
  const byDivision = new Map<string, { code: string; label: string }[]>()
  let total = 0
  for (const activity of onrc) {
    if (activity.rev !== revision) continue
    total += 1
    const division = activity.code.slice(0, 2)
    const list = byDivision.get(division) ?? []
    list.push({ code: activity.code, label: activity.label ? commaBelow(activity.label) : activity.code })
    byDivision.set(division, list)
  }
  const groups = [...byDivision.entries()]
    .map(([division, activities]) => ({
      division,
      label: divisionLabel(division),
      activities: activities.sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => b.activities.length - a.activities.length || a.division.localeCompare(b.division))
  return { revision, total, groups }
}

/**
 * The division a main activity counts under in the `/companies` snapshot:
 * ANAF's codes mix CAEN revisions, and the snapshot keeps a class's division
 * except Rev.3 vehicle repair (95.3x), which it moves back to 45. A code
 * outside the Rev.2 divisions has no sector to compare with.
 */
function snapshotDivision(code: string): string | null {
  const division = code.startsWith('953') ? '45' : code.slice(0, 2)
  return caenDivision(division) ? division : null
}

/**
 * Which revisions may name a main activity whose revision ANAF did not say:
 * Rev.2, the nomenclature ANAF's codes have mostly been in, then Rev.3. A code
 * can mean different things in different revisions, so a known revision names
 * it only from its own.
 */
const UNKNOWN_REVISION_NAMES = ['rev2', 'rev3']

function mainActivityOf(profile: PrivateCompanyProfile): CompanyProfileModel['mainActivity'] {
  const fiscal = profile.fiscal.fiscalCaen
  if (!fiscal?.code) return null
  const { code } = fiscal
  const labelled = profile.caenActivities.filter((activity) => activity.code === code && activity.label && activity.rev)
  const revisions = fiscal.rev ? [fiscal.rev] : UNKNOWN_REVISION_NAMES
  const named = revisions.map((rev) => labelled.find((activity) => activity.rev === rev)).find((activity) => activity !== undefined)
  const division = snapshotDivision(code)
  return { code, label: named?.label ? commaBelow(named.label) : code, division, divisionLabel: division ? divisionLabel(division) : null }
}

// ────────────────────────────────────────── public money ──

/** Which bar a receipt flow is drawn in: the two SEAP instruments apart, every other receipt together. */
function bucketOf(flowType: string): 'contracts' | 'direct' | 'other' {
  return flowType === 'procurement_contract' ? 'contracts' : flowType === 'direct_acquisition' ? 'direct' : 'other'
}

/**
 * A row's amount when the source published one; a row of records with no
 * amount (null, or a zero beside a count) is unvalued. A negative amount is
 * published — a reversal — and stays in every sum.
 */
function valued(totalRon: number | null, count: number): number | null {
  return totalRon === null || (totalRon === 0 && count > 0) ? null : totalRon
}

/**
 * The public money a company received, kept as the source split it: every
 * receipt flow by its own name (never folded into „contracts"), the records
 * with no published amount counted rather than summed as zero, the records
 * with no year kept apart from the dated ones, and PNRR commitments —
 * obligations, not payments — outside every total.
 */
function moneyOf(profile: PrivateCompanyProfile, currentYear: number): CompanyProfileModel['money'] {
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
          return {
            year,
            contracts: entry?.contracts ?? 0,
            direct: entry?.direct ?? 0,
            other: entry?.other ?? 0,
            count: entry?.count ?? 0,
            unvalued: entry?.unvalued ?? 0,
          }
        })

  const receipts = flows.filter((flow) => flow.receipt)
  const commitments = flows.filter((flow) => flow.flowType === 'pnrr_commitment')
  // With no rows by year, the flows alone can say which records carry no amount.
  const hasYearRows = (money?.byYear ?? []).some((row) => isReceiptFlow(row.flowType))
  return {
    flows,
    received: receipts.reduce((sum, flow) => sum + (flow.total ?? 0), 0),
    receivedCount: receipts.reduce((sum, flow) => sum + flow.count, 0),
    unvaluedCount: hasYearRows ? unvaluedCount : receipts.reduce((sum, flow) => sum + (flow.total === null ? flow.count : 0), 0),
    commitments: {
      total: commitments.reduce((sum, flow) => sum + (flow.total ?? 0), 0),
      count: commitments.reduce((sum, flow) => sum + flow.count, 0),
    },
    byYear,
    undated,
    firstYear,
    lastYear,
    openYear: lastYear === currentYear ? lastYear : null,
  }
}

// ───────────────────────────────────────────────── model ──

/** A share of a total under this says nothing a reader can use: „0,0%" four times. */
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

export function buildCompanyProfileModel(
  profile: PrivateCompanyProfile,
  {
    snapshot = COMPANY_HUB_SNAPSHOT,
    now = new Date(),
  }: {
    /** The `/companies` figures the shares are of. */
    readonly snapshot?: CompanyHubSnapshot
    /** Today, for the calendar year in progress. */
    readonly now?: Date
  } = {},
): CompanyProfileModel {
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
  const netResult = seriesOf(netResultOf)

  const activity = mainActivityOf(profile)
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
  const recentYears = years.slice(-RECENT_YEARS)

  return {
    profile,
    displayName: displayCompanyName(profile.legalName),
    legalFormName: legalFormName(profile.legalForm),
    status: statusOf(profile),
    foundedYear: founded !== null && Number.isFinite(founded) ? founded : null,
    place: {
      label: placeLabel(profile.geography?.uatName ?? profile.address.locality, countyName),
      county: countyName ? commaBelow(countyName) : null,
      countyCode,
    },
    mainActivity: activity,
    activities: activityGroups(profile),
    latest,
    previous,
    stale: latest !== null && latest.fiscalYear < snapshot.fiscalYear - 1,
    span,
    missingYears: span.filter((year) => !byYear.has(year)),
    series: { turnover: seriesOf((year) => year.turnover), netResult, employees: seriesOf((year) => year.employees) },
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
    money: moneyOf(profile, now.getFullYear()),
  }
}
