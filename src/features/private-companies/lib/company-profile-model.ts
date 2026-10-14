import { i18n } from '@lingui/core'
import { t } from '@lingui/core/macro'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type {
  PrivateCompanyActivitySelection,
  PrivateCompanyFinancialYear,
  PrivateCompanyMetricStatus,
  PrivateCompanyProfile,
  PrivateCompanyStatementPublisher,
} from '@/schemas/private-company'
import type { CompanyCaenClassState, CompanyRegistryEvidence, CompanyRegistryValue } from '@/schemas/private-company-registry'
import { divisionLabel } from './caen-divisions'
import { DISSOLUTION_STATUSES, INSOLVENCY_STATUSES, STATUS_ACTIVE, STATUS_STRUCK_OFF } from './company-status-codes'
import { foldCountyName } from './county-names'
import { comparable, metricStatus, qualifiedNet, reportedNumber, sourceValues, type SourceValue } from './financial-qualification'
import { isReceiptFlow } from './public-money-display'
import { legalFormName } from './company-legal-forms'
import { assumedMainOf, withAnafWithdrawn, type AssumedMainView } from './company-main-activity-model'

/**
 * What the company profile draws, derived from the company's record: who it
 * is in a sentence, its years with the gaps kept, its registry evidence in the
 * pinned ONRC edition, and the public money it received. No figure here comes
 * from a static snapshot: shares of sector, county or country totals, a
 * founding year, an age and a „sector" grouping are not computed, because no
 * edition-bound total exists to compare with.
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

/**
 * One division of the registry's activities in one CAEN revision: `revision`
 * is the rows' own (`rev0`…`rev3`, or another the source names), null for
 * rows that name none. `key` is unique per revision and division, so the same
 * digits in two revisions stay two groups. A division is derived only from a
 * row the API qualifies as a `class`. The rows that are no class — a short
 * source code, an unknown revision, a key no catalog names, an unparsed code
 * — sit in one group of unqualified observations per revision; the rows of an
 * older API that names no class state sit in one group per revision whose
 * qualification is unavailable (its padded `0201` may be a short token `201`,
 * so it is never read as division 02). Both have `division` null, no label,
 * and are never recoded into a sector.
 */
export interface ActivityGroup {
  readonly key: string
  readonly revision: string | null
  /** The two-digit division of a classified group; null for the revision's unqualified or unassessed observations. */
  readonly division: string | null
  /** `class`: a division of qualified classes; `unqualified`: rows qualified as no class; `unassessed`: no class state served (older API). */
  readonly kind: 'class' | 'unqualified' | 'unassessed'
  readonly label: string
  /**
   * Every row provided, repeats kept; `label` only from the row's own revision, null when it gives none.
   * `classState` where the API names it: only a `class` row is a classified activity (a short source code
   * is ambiguous between a class and a group, and has no label); null from an older API.
   */
  readonly activities: readonly ActivityRow[]
}

/**
 * One registry activity row. `isMainCaen` / `matchesAssumedMainCode` are the
 * API's flags as the mapper kept them (only on a class row of the pinned
 * edition while the ANAF-assumed main activity is current); null otherwise,
 * absent from an older API (the row then reads exactly as before).
 */
export interface ActivityRow {
  readonly code: string
  readonly label: string | null
  readonly classState: CompanyCaenClassState | null
  readonly isMainCaen?: boolean | null
  readonly matchesAssumedMainCode?: boolean | null
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

/**
 * Where the registry has the company, from the pinned edition's complete
 * status consensus: in business, or on its way out and how; `other` for a
 * consensus code none of those name. Without a consensus: `conflict` when its
 * observations hold different codes (all of them stay listed), `unqualified`
 * when the edition cannot say (partial or unresolved evidence, no profile in
 * the edition, or a registry that cannot answer).
 */
export type StatusKind = 'active' | 'insolvency' | 'dissolution' | 'struck-off' | 'other' | 'conflict' | 'unqualified'

/** The statements' size classes, as `/companies` counts them. */
export type SizeClass = 'none' | 'micro' | 'small' | 'medium' | 'large'

/** One statement's published values, for inspection: every year, every status. */
export interface StatementValues {
  readonly year: number
  readonly publisher: PrivateCompanyStatementPublisher | null
  /** Why the statement was not assessed; null when it was. */
  readonly notAssessed: string | null
  /** Assessed under another policy, evaluator or release than the page's figures: in no series, comparison or count. */
  readonly otherBasis: boolean
  readonly holdReason: string | null
  /** Every value the statement published, reported or not. */
  readonly values: readonly SourceValue[]
  /**
   * The net result the evaluator derives from profit and loss: its status, and
   * its exact value only when reported. Null when the statement was not
   * assessed. Never a source value, never computed here.
   */
  readonly netResult: { readonly status: PrivateCompanyMetricStatus; readonly value: string | null } | null
  /** The derived net result is held (not reported, not merely missing), whatever its components' states. */
  readonly netHeld: boolean
  /** How many of `values` stay out of the page's figures, series and comparisons. */
  readonly keptOut: number
  readonly source: PrivateCompanyFinancialYear['source']
}

export interface CompanyProfileModel {
  readonly profile: PrivateCompanyProfile
  readonly displayName: string
  readonly legalFormName: string | null
  /** `label`: this application's presentation name of the consensus code, never an ONRC-observed label. */
  readonly status: { readonly kind: StatusKind; readonly label: string | null }
  /** The pinned ONRC scope and this CUI's evidence in it. */
  readonly registry: CompanyRegistryEvidence
  /** The civil date ONRC recorded, with its basis; null without a profile in the edition. Never a founding date. */
  readonly recordedDate: CompanyRegistryValue | null
  /** Some resolved identifier holds a public „în funcțiune" (1048) observation — also beside a conflicting one. */
  readonly activeObservation: boolean
  /** `label`: the registered office as a reader writes it („Gherla, Cluj"). */
  readonly place: { readonly label: string | null; readonly county: string | null; readonly countyCode: string | null }
  /**
   * The main activity declared to ANAF — ANAF's statement, never a current
   * ONRC fact. `label` comes only from the code's own CAEN revision: null when
   * ANAF's published data identifies no revision (the same digits can name
   * different activities in different revisions), and null for a known
   * revision that gives no name. `registry` lists what the pinned ONRC edition
   * observes under the same digits, each with its own revision — the
   * registry's statement, never ANAF's.
   */
  readonly mainActivity: {
    readonly code: string
    readonly revision: string | null
    readonly label: string | null
    readonly registry: readonly { readonly revision: string; readonly label: string }[]
  } | null
  /**
   * The derived activity selection, when the API serves one for the pinned
   * edition: it then heads the activities band in place of `mainActivity`
   * (which stays for an older API). A selection, never a principal activity.
   */
  readonly selection: PrivateCompanyActivitySelection | null
  /** The API refused the selection alone: the band says it cannot be shown, rather than falling back. */
  readonly selectionUnavailable: boolean
  /**
   * The ANAF-assumed main activity: an assumption from ANAF's fiscal code,
   * never a principal activity ONRC declared. Shown above the derived
   * selection, which keeps its own meaning. The activity rows' flags come
   * from the same answer.
   */
  readonly assumedMain: AssumedMainView
  /**
   * The registry's activities in every revision it lists (Rev.0 and rows that
   * name no revision included), by revision and division, the newest edition
   * first, each revision's unqualified observations last. `total` and
   * `byRevision` count every row, unqualified ones included. `revision` is the one revision every row names, null when they name
   * several or none; `byRevision` counts the rows of each. Counts are the rows
   * provided — one activity may appear in several revisions — not distinct
   * authorisations. The transport gives a row only its code, revision, label
   * and source (no edition, resource, row or identifier): a repeated row is
   * kept as given, and nothing here claims per-source-row completeness.
   */
  readonly activities: {
    readonly revision: string | null
    readonly total: number
    readonly byRevision: readonly { readonly revision: string | null; readonly count: number }[]
    readonly groups: readonly ActivityGroup[]
  }
  /**
   * Who published the statements, each publisher's first and last year, oldest
   * first: the Ministry of Finance (FY2008–2018) and ANAF (FY2019+) are
   * different sources. `publisher` is null where the API did not name one.
   */
  readonly statementSources: readonly {
    readonly publisher: PrivateCompanyStatementPublisher | null
    readonly first: number
    readonly last: number
  }[]
  /** The newest statement; null when the company never filed one that was published. */
  readonly latest: PrivateCompanyFinancialYear | null
  /** The statement a year before the newest, when there is one. */
  readonly previous: PrivateCompanyFinancialYear | null
  /** The newest statement and the one before were qualified under one policy: their figures may be compared. */
  readonly comparable: boolean
  /**
   * The newest statement is more than two fiscal years behind the calendar
   * (a statement for year Y is published during Y+1): the figures are old news.
   */
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
  /**
   * The statements' qualification. Every series, trend, count and comparison
   * on the page shares ONE basis: the newest assessed statement's policy,
   * evaluator and release (`policy`). A statement assessed on another basis is
   * a gap there, named in `otherBasisYears`; every statement's published values
   * stay listed in `statements`, whatever their status.
   */
  readonly qualification: {
    readonly policy: { readonly version: string | null; readonly approvedOn: string | null } | null
    /** Why the newest statement was not assessed; null when it was. */
    readonly latestNotAssessed: string | null
    readonly otherBasisYears: readonly number[]
    /** Every statement, newest first. */
    readonly statements: readonly StatementValues[]
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

// ───────────────────────────────────────────────── names ──

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

/**
 * The status the head shows: the consensus code's kind, or why there is
 * none. A conflict is never resolved by priority — an „în funcțiune"
 * observation beside a „radiată" one is a conflict, both listed.
 */
function statusOf(profile: PrivateCompanyProfile): CompanyProfileModel['status'] {
  const code = profile.status?.code ?? null
  const label = profile.status?.label ? commaBelow(profile.status.label) : null
  if (code === null) {
    const conflict = profile.registry.profile?.statusCode.basis === 'multiple_values'
    return { kind: conflict ? 'conflict' : 'unqualified', label: null }
  }
  if (code === STATUS_ACTIVE) return { kind: 'active', label }
  if (code === STATUS_STRUCK_OFF) return { kind: 'struck-off', label }
  if ((INSOLVENCY_STATUSES as readonly string[]).includes(code)) return { kind: 'insolvency', label }
  if ((DISSOLUTION_STATUSES as readonly string[]).includes(code)) return { kind: 'dissolution', label }
  return { kind: 'other', label }
}

// ──────────────────────────────────────────── activities ──

/** `rev3` → „Rev.3", as the nomenclature names its editions. */
export function caenEdition(revision: string): string {
  return revision.replace(/^rev/u, 'Rev.')
}

/**
 * Newest edition first (Rev.3 … Rev.0), then any other revision the source
 * names, then rows that name none. An order to show them in — never a choice
 * of one revision over the others.
 */
export function compareCaenRevisions(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  const left = /^rev(\d+)$/u.exec(a)?.[1]
  const right = /^rev(\d+)$/u.exec(b)?.[1]
  if (left !== undefined && right !== undefined) return Number(right) - Number(left)
  if (left !== undefined) return -1
  if (right !== undefined) return 1
  return a.localeCompare(b)
}

/**
 * A division's name in the group's own revision. Only the Rev.2 division list
 * is held here, so another revision's division is named by its number and
 * edition — never by the Rev.2 name of the same digits (Rev.1 62 is air
 * transport, not software) — and a row with no revision by its number alone.
 */
function groupLabel(division: string, revision: string | null): string {
  if (revision === 'rev2') return divisionLabel(division)
  return revision ? t`Diviziunea ${division} (CAEN ${caenEdition(revision)})` : t`Diviziunea ${division} (fără revizie CAEN)`
}

/**
 * The group a row belongs to. Only a row the API qualifies as `class` is
 * grouped under the division its digits name. A short source code padded to
 * four digits (`201` → `0201`) is no class of division 02: it, and every other
 * non-class state, is `unqualified`. A row with no class state (an older API)
 * is `unassessed`: such an API cannot tell a class 0201 from a short token
 * 201, so it is never grouped under a division either.
 */
function groupKind(classState: CompanyCaenClassState | null): ActivityGroup['kind'] {
  if (classState === 'class') return 'class'
  return classState === null ? 'unassessed' : 'unqualified'
}

const KIND_ORDER: Readonly<Record<ActivityGroup['kind'], number>> = { class: 0, unqualified: 1, unassessed: 2 }

function activityGroups(profile: PrivateCompanyProfile): CompanyProfileModel['activities'] {
  const onrc = profile.caenActivities.filter((activity) => activity.source === 'onrc')
  const groups = new Map<
    string,
    { revision: string | null; division: string | null; kind: ActivityGroup['kind']; activities: ActivityRow[] }
  >()
  const counts = new Map<string | null, number>()
  for (const activity of onrc) {
    // The mapper keeps a label only beside a revision; a row with none is never named.
    const revision = activity.rev
    const classState = activity.classState ?? null
    const kind = groupKind(classState)
    const division = kind === 'class' ? activity.code.slice(0, 2) : null
    const key = JSON.stringify([revision, kind === 'class' ? division : kind])
    const group = groups.get(key) ?? { revision, division, kind, activities: [] }
    // A catalog label names only a qualified class, never a guess from the code.
    const labelled = revision !== null && activity.label !== null && kind === 'class'
    group.activities.push({
      code: activity.code,
      label: labelled && activity.label ? commaBelow(activity.label) : null,
      classState,
      ...(activity.isMainCaen !== undefined ? { isMainCaen: activity.isMainCaen } : {}),
      ...(activity.matchesAssumedMainCode !== undefined ? { matchesAssumedMainCode: activity.matchesAssumedMainCode } : {}),
    })
    groups.set(key, group)
    counts.set(revision, (counts.get(revision) ?? 0) + 1)
  }
  const byRevision = [...counts.entries()]
    .map(([revision, count]) => ({ revision, count }))
    .sort((a, b) => compareCaenRevisions(a.revision, b.revision))
  return {
    revision: byRevision.length === 1 ? (byRevision[0]?.revision ?? null) : null,
    total: onrc.length,
    byRevision,
    groups: [...groups.entries()]
      .map(([key, group]) => ({
        key,
        revision: group.revision,
        division: group.division,
        kind: group.kind,
        label:
          group.kind === 'unqualified'
            ? t`Observații necalificate`
            : group.kind === 'unassessed' || group.division === null
              ? t`Calificare indisponibilă`
              : groupLabel(group.division, group.revision),
        activities: group.activities.sort((a, b) => a.code.localeCompare(b.code)),
      }))
      // Each revision's unqualified, then unassessed, observations close its block.
      .sort(
        (a, b) =>
          compareCaenRevisions(a.revision, b.revision) ||
          KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
          b.activities.length - a.activities.length ||
          (a.division ?? '').localeCompare(b.division ?? ''),
      ),
  }
}

function mainActivityOf(profile: PrivateCompanyProfile): CompanyProfileModel['mainActivity'] {
  const fiscal = profile.fiscal.fiscalCaen
  if (!fiscal?.code) return null
  const { code } = fiscal
  const revision = fiscal.rev
  // A name only from the code's own revision; with no revision there is none.
  const own = revision ? profile.caenActivities.find((activity) => activity.code === code && activity.rev === revision && activity.label) : undefined
  // Every revision the registry names the same digits in, Rev.0 included, each with its own label.
  const registry: { revision: string; label: string }[] = []
  for (const activity of profile.caenActivities) {
    if (activity.source !== 'onrc' || activity.code !== code || !activity.rev || !activity.label) continue
    const entry = { revision: activity.rev, label: commaBelow(activity.label) }
    if (!registry.some((seen) => seen.revision === entry.revision && seen.label === entry.label)) registry.push(entry)
  }
  registry.sort((a, b) => compareCaenRevisions(a.revision, b.revision))
  return {
    code,
    revision,
    label: own?.label ? commaBelow(own.label) : null,
    registry,
  }
}

function statementSourcesOf(years: readonly PrivateCompanyFinancialYear[]): CompanyProfileModel['statementSources'] {
  const ranges = new Map<PrivateCompanyStatementPublisher | null, { first: number; last: number }>()
  for (const year of years) {
    const range = ranges.get(year.sourceSystem)
    ranges.set(year.sourceSystem, {
      first: Math.min(range?.first ?? year.fiscalYear, year.fiscalYear),
      last: Math.max(range?.last ?? year.fiscalYear, year.fiscalYear),
    })
  }
  return [...ranges.entries()].map(([publisher, range]) => ({ publisher, ...range })).sort((a, b) => a.first - b.first)
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

/** A statement's published values and what the page made of them. */
function statementValuesOf(year: PrivateCompanyFinancialYear, onBasis: boolean): StatementValues {
  const values = sourceValues(year)
  const assessed = year.qualification.assessment === 'assessed'
  const otherBasis = assessed && !onBasis
  const netStatus = metricStatus(year, 'net_result')
  return {
    year: year.fiscalYear,
    publisher: year.sourceSystem,
    notAssessed: assessed ? null : (year.qualification.reason ?? 'qualification_missing'),
    otherBasis,
    holdReason: year.qualification.holdReason,
    values,
    netResult: netStatus === null ? null : { status: netStatus, value: netStatus === 'reported' ? year.qualification.netResult : null },
    netHeld: netStatus !== null && netStatus !== 'reported' && netStatus !== 'missing',
    keptOut: assessed && !otherBasis ? values.filter((value) => value.status !== 'reported').length : values.length,
    source: year.source,
  }
}

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

/**
 * The model once a history row reported ANAF's source withdrawn under the
 * assignment shown (`identity`, its `cacheKey`): ANAF's history is public
 * only while the company's fiscal row is, so the assignment loses its ANAF
 * evidence and interpretation (`withAnafWithdrawn`) and no activity row
 * keeps a main flag — at once, before the profile read again answers. A
 * profile under another identity (the reread's answer) is shown as served.
 */
export function withAnafWithdrawnSeen(model: CompanyProfileModel, identity: string | null): CompanyProfileModel {
  const view = model.assumedMain
  if (identity === null || view.kind !== 'assigned' || view.activity.cacheKey !== identity) return model
  return {
    ...model,
    assumedMain: { kind: 'assigned', activity: withAnafWithdrawn(view.activity) },
    activities: { ...model.activities, groups: model.activities.groups.map((group) => ({ ...group, activities: group.activities.map(unflaggedRow) })) },
  }
}

/** A row without the main flags (rows an older API served without them stay as they were). */
function unflaggedRow(row: ActivityRow): ActivityRow {
  return row.isMainCaen === undefined && row.matchesAssumedMainCode === undefined ? row : { ...row, isMainCaen: null, matchesAssumedMainCode: null }
}

/**
 * The model once a dependent read answered that the company of this very
 * answer (`refused`, the profile object) is no longer a public directory
 * company: its main activity is withheld (`refused`) and no activity row
 * keeps a main flag or hint — at once, before the profile read again
 * answers; the page's own privacy path then hides the answer
 * (`useProfileRegistryScope`). Another answer (the reread's) is shown as
 * served.
 */
export function withOwningCompanyRefused(model: CompanyProfileModel, refused: PrivateCompanyProfile | null): CompanyProfileModel {
  if (refused === null || refused !== model.profile) return model
  return {
    ...model,
    assumedMain: { kind: 'refused' },
    activities: { ...model.activities, groups: model.activities.groups.map((group) => ({ ...group, activities: group.activities.map(unflaggedRow) })) },
  }
}

export function buildCompanyProfileModel(
  profile: PrivateCompanyProfile,
  {
    now = new Date(),
  }: {
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
  // ONE basis for every series, trend and count: the newest assessed
  // statement's policy, evaluator and release. A statement qualified on
  // another basis is a gap beside it, never a point on the same scale.
  const basis = [...years].reverse().find((year) => year.qualification.assessment === 'assessed') ?? null
  const onBasis = (year: PrivateCompanyFinancialYear) => basis !== null && comparable(year, basis)
  // Every series plots REPORTED values on the basis only: a held, unassessed or other-basis year is a gap.
  const seriesOf = (read: (year: PrivateCompanyFinancialYear) => number | null): YearValue[] =>
    span.map((year) => {
      const entry = byYear.get(year)
      return { year, value: entry && onBasis(entry) ? read(entry) : null }
    })
  const turnoverOf = (year: PrivateCompanyFinancialYear) => (onBasis(year) ? reportedNumber(year, 'turnover') : null)
  const employeesOf = (year: PrivateCompanyFinancialYear) => (onBasis(year) ? reportedNumber(year, 'employees') : null)
  const netOf = (year: PrivateCompanyFinancialYear) => (onBasis(year) ? qualifiedNet(year) : null)
  const netResult = seriesOf(netOf)

  const countyName = profile.geography?.countyName ?? profile.address.county
  const countyCode = countyCodeOf(countyName)
  const recentYears = years.slice(-RECENT_YEARS)
  const { registry } = profile

  return {
    profile,
    displayName: displayCompanyName(profile.legalName),
    legalFormName: legalFormName(profile.legalForm, (descriptor) => i18n._(descriptor)),
    status: statusOf(profile),
    registry,
    recordedDate: registry.profile?.recordedDate ?? null,
    activeObservation: registry.identifiers.some((identifier) => identifier.hasActiveObservation),
    place: {
      label: placeLabel(profile.geography?.uatName ?? profile.address.locality, countyName),
      county: countyName ? commaBelow(countyName) : null,
      countyCode,
    },
    mainActivity: mainActivityOf(profile),
    selection: profile.activitySelection ?? null,
    selectionUnavailable: profile.activitySelectionUnavailable === true,
    assumedMain: assumedMainOf(profile),
    activities: activityGroups(profile),
    statementSources: statementSourcesOf(years),
    latest,
    previous,
    comparable: latest !== null && previous !== null && comparable(latest, previous),
    stale: latest !== null && latest.fiscalYear < now.getFullYear() - 2,
    span,
    missingYears: span.filter((year) => !byYear.has(year)),
    series: { turnover: seriesOf(turnoverOf), netResult, employees: seriesOf(employeesOf) },
    recent: {
      years: recentYears.map((year) => year.fiscalYear),
      turnover: recentYears.map(turnoverOf),
      netResult: recentYears.map(netOf),
      employees: recentYears.map(employeesOf),
    },
    // Counted over reported net results on the basis only; the page says which statements it cannot count.
    lossYears: netResult.filter((point) => point.value !== null && point.value < 0).length,
    sizeClass: sizeClassOf(latest ? employeesOf(latest) : null),
    qualification: {
      policy: basis ? { version: basis.qualification.policyVersion, approvedOn: basis.qualification.policyApprovedOn } : null,
      latestNotAssessed: latest && latest.qualification.assessment !== 'assessed' ? (latest.qualification.reason ?? 'qualification_missing') : null,
      otherBasisYears: years.filter((year) => year.qualification.assessment === 'assessed' && !onBasis(year)).map((year) => year.fiscalYear),
      statements: years.map((year) => statementValuesOf(year, onBasis(year))).reverse(),
    },
    money: moneyOf(profile, now.getFullYear()),
  }
}
