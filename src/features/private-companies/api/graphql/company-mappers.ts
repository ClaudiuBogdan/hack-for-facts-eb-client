/**
 * Maps the redesign GraphQL company shapes onto the UI's `PrivateCompanyProfile`
 * (the REST-era contract the 5-tab profile already consumes). Keeping the UI
 * contract stable means the mapping lives here, not in the components.
 *
 * Notable reconciliations vs. the old REST shape:
 * - `matchConfidence` is uppercase SAFE/UNMATCHED in GraphQL (no manual-review).
 * - financial years use `year` + string Money/BigInt scalars → coerced to
 *   `fiscalYear` + numbers, with `currency: 'RON'`; each keeps its publisher
 *   (`sourceSystem`: ANAF or MFP).
 * - `fiscal.anafFound` is derived (the GraphQL surface has no explicit flag):
 *   ANAF is "found" only on ANAF's own evidence — its fiscal record or an
 *   ANAF-published statement. An MFP-only history is not ANAF data.
 * - `sources` are synthesized from `asOf.onrc` / `asOf.anaf` (no fabricated
 *   URLs), each the source's own date; one source never stands in for another.
 * - the ONRC fields are the pinned edition's qualified values: outside the
 *   edition (or with a registry that cannot answer) they are null here even if
 *   a response carried one, so no older scalar is ever read as current.
 * - the derived activity selection is kept only for the pinned edition, and
 *   only when it holds together (see `mapActivitySelection`); otherwise the
 *   profile reads as an older API's did.
 * - the ANAF-assumed main activity is parsed strictly and kept only when it
 *   holds together; its flags only on ONRC class rows of the pinned edition
 *   while it is current, and only when they agree with its selected key
 *   (see `mapMainActivity`, `mainFlagsOf`).
 */
import {
  COMPANY_ACTIVITY_BASES,
  COMPANY_ANAF_CAEN_FORMS,
  COMPANY_ANAF_ONRC_AGREEMENTS,
  FINANCIAL_METRICS,
  FINANCIAL_SOURCE_METRICS,
  privateCompanyMetricStatusSchema,
  type FinancialSourceMetric,
  type PrivateCompanyActivitySelection,
  type PrivateCompanyCaenActivity,
  type PrivateCompanyFinancialSummary,
  type PrivateCompanyFinancialTrajectory,
  type PrivateCompanyFinancialYear,
  type PrivateCompanyLongFormStatement,
  type PrivateCompanyMatchConfidence,
  type PrivateCompanyMetricStatus,
  type PrivateCompanyProfile,
  type PrivateCompanyPublicMoney,
  type PrivateCompanySource,
  type PrivateCompanyStatementPublisher,
  type PrivateCompanyStatementQualification,
  type PrivateCompanyStatementSource,
} from '@/schemas/private-company'
import {
  COMPANY_MAIN_ACTIVITY_SELECTING_STATUSES,
  companyMainActivityReadSchema,
  mainActivityProvenanceReadable,
  type CompanyMainActivity,
  type CompanyMainActivityRead,
} from '@/schemas/private-company-main-activity'
import { withAnafWithdrawn } from '../../lib/company-main-activity-model'
import { COMPANY_REGISTRY_COVERAGES, type CompanyRegistryEnvelope } from '@/schemas/private-company-registry'
import {
  COMPANY_RESOLVE_LABEL_SOURCES,
  type CompanyResolveDim,
  type CompanyResolveLabelSource,
  type CompanyResolveResult,
} from '@/schemas/private-company-search'
import { notAssessed, QUALIFICATION_EVALUATOR, SUMMARY_METRICS } from '../../lib/financial-qualification'
import type {
  CompanyProfileResponse,
  RawActivitySelection,
  RawCompany,
  RawCompanyFinancialYear,
  RawCompanyResolveResult,
  RawLongFormStatement,
  RawStatementQualification,
} from './company-queries'
import { mapCaenClassState, mapCaenRevision, mapRegistryEnvelope, mapRegistryEvidence } from './company-registry-graphql'

/** Whose name the API gave: an unknown answer is never credited to the ONRC edition. */
function mapNameSource(raw: string): 'onrc_edition' | 'core_organization' {
  return raw.toLowerCase() === 'onrc_edition' ? 'onrc_edition' : 'core_organization'
}

function mapStatus(raw: RawCompany['headlineStatus']): PrivateCompanyProfile['status'] {
  if (!raw) return null
  const source = raw.labelSource?.toLowerCase()
  return {
    code: raw.code,
    label: raw.label ?? raw.code,
    labelSource: source === 'api_nomenclature' && raw.label ? 'api_nomenclature' : 'code',
  }
}

function toNumberOrNull(value: string | number | null | undefined): number | null {
  if (value == null) return null
  if (typeof value === 'string') {
    // `Number('')` and `Number('  ')` are both 0, so an empty Money string
    // would otherwise be mapped as "this company received exactly zero".
    if (value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return Number.isFinite(value) ? value : null
}

function mapMatchConfidence(raw: string): PrivateCompanyMatchConfidence {
  switch (raw.toUpperCase()) {
    case 'SAFE':
      return 'safe'
    case 'UNMATCHED':
      return 'unmatched'
    default:
      // Future-proof: any other confidence routes through manual review.
      return 'manual-review'
  }
}

function mapCaenSource(raw: string): PrivateCompanyCaenActivity['source'] | null {
  const source = raw.toLowerCase()
  return source === 'anaf' || source === 'onrc' ? source : null
}

function memberOf<T extends string>(values: readonly T[], raw: string | null | undefined): T | null {
  const lowered = raw?.toLowerCase()
  return values.find((value) => value === lowered) ?? null
}

const FOUR_DIGITS = /^\d{4}$/u

/**
 * The derived activity selection, fail closed: kept only for the edition the
 * page is pinned to, with a basis, coverage, form and agreement this client
 * knows, marked derived, and holding together — an ONRC selection with its
 * own known revision and four-digit code, an ANAF one with no revision at all
 * (ANAF publishes none) and a label only where every catalog revision agrees,
 * an uncatalogued ANAF code with no catalog text, and no code for a basis that
 * selects nothing. Anything else is no selection: the band then reads as an
 * older API's did, never with a guessed revision or label.
 */
export function mapActivitySelection(raw: RawActivitySelection | null | undefined, registry: CompanyRegistryEnvelope): PrivateCompanyActivitySelection | null {
  if (!raw) return null
  if (registry.state !== 'published' || registry.editionId === null || raw.editionId !== registry.editionId) return null
  const basis = memberOf(COMPANY_ACTIVITY_BASES, raw.basis)
  const caenCoverage = memberOf(COMPANY_REGISTRY_COVERAGES, raw.caenCoverage)
  // A form this client does not know reads as unqualified: said generically, never guessed usable.
  const anafCodeForm = memberOf(COMPANY_ANAF_CAEN_FORMS, raw.anafCodeForm) ?? 'unqualified'
  const agreement = memberOf(COMPANY_ANAF_ONRC_AGREEMENTS, raw.agreement)
  if (basis === null || caenCoverage === null || agreement === null || !raw.derived) return null
  const source = raw.source?.toLowerCase() ?? null
  const counts = {
    classKeyCount: raw.classKeyCount,
    unqualifiedObservationCount: raw.unqualifiedObservationCount,
    observationCount: raw.observationCount,
    caenCoverage,
    editionId: raw.editionId,
    editionSourceDate: raw.editionSourceDate,
    anafCode: raw.anafCode,
    anafCodeForm,
    // The database's verdict, as sent; this client holds no usable set of its own.
    anafCodeUsable: raw.anafCodeUsable ?? null,
    anafCaenFormPolicy: raw.anafCaenFormPolicy ?? null,
    anafStatusDate: raw.anafStatusDate,
    agreement,
  }
  const none = { source: null, code: null, revision: null, label: null, descriptionStatus: null, descriptions: [] }
  switch (basis) {
    case 'onrc_single_class':
    case 'onrc_class_anaf_numeric_match': {
      const revision = mapCaenRevision(raw.revision)
      const fits = basis === 'onrc_single_class' ? raw.classKeyCount === 1 : raw.classKeyCount >= 2 && agreement === 'match_one_key'
      if (source !== 'onrc' || revision === null || raw.code === null || !FOUR_DIGITS.test(raw.code) || !fits) return null
      return { basis, ...counts, source, code: raw.code, revision, label: raw.label, descriptionStatus: raw.label ? 'exact' : 'missing', descriptions: [] }
    }
    case 'anaf_fiscal_code': {
      if (source !== 'anaf' || raw.code === null || !FOUR_DIGITS.test(raw.code) || raw.classKeyCount !== 0) return null
      const status = memberOf(['consensus', 'conflict', 'missing'] as const, raw.descriptionStatus) ?? 'missing'
      const descriptions = raw.descriptions.flatMap((entry) => {
        const revision = mapCaenRevision(entry.revision)
        return revision === null ? [] : [{ revision, label: entry.label }]
      })
      return { basis, ...counts, source, code: raw.code, revision: null, label: status === 'consensus' ? raw.label : null, descriptionStatus: status, descriptions }
    }
    case 'anaf_fiscal_uncatalogued':
      // A source observation: its digits, never a catalog text or a revision.
      if (source !== 'anaf' || raw.code === null || raw.classKeyCount !== 0) return null
      return { basis, ...counts, ...none, source, code: raw.code, descriptionStatus: 'missing' }
    case 'onrc_multiple_classes':
    case 'no_qualified_selection':
      if (basis === 'onrc_multiple_classes' && raw.classKeyCount < 2) return null
      return { basis, ...counts, ...none }
  }
}

/**
 * The ANAF-assumed main activity as the profile keeps it: `read` undefined
 * when the API served none (an older API, a null field) — nothing new is
 * shown — and `unreadable` when it served one this client cannot read.
 */
export interface MappedMainActivity {
  readonly read: CompanyMainActivityRead | undefined
  readonly unreadable: boolean
}

const MAIN_NOT_SERVED: MappedMainActivity = { read: undefined, unreadable: false }
const MAIN_UNREADABLE: MappedMainActivity = { read: undefined, unreadable: true }

const NO_INTERPRETATION = { status: null, matchBasis: null, revisionBasis: null, resolved: null, candidates: null, correctionId: null } as const
const NO_TOKEN = { originalToken: null, jsonType: null, tokenForm: null, canonicalDigits: null, assumedCode: null, v3Form: null } as const

/**
 * What the API withholds, applied again here so a field it suppresses can
 * never come back from a response that carried it anyway: with
 * `anafWithdrawn`, whatever the currentness, every ANAF field and the whole
 * interpretation of ANAF's code; under SOURCE_WITHDRAWN the same; under
 * ONRC_UNAVAILABLE everything ONRC-derived (the interpretation and the
 * edition); pending with no status (the interpretation withheld) the
 * interpretation and every token-derived ANAF field, the fiscal source's
 * dates, ids and custody staying.
 */
function withheld(served: CompanyMainActivity): CompanyMainActivity {
  const activity = served.anafWithdrawn ? withAnafWithdrawn(served) : served
  switch (activity.currentness) {
    case 'SOURCE_WITHDRAWN':
      return { ...activity, ...NO_INTERPRETATION, anaf: null }
    case 'ONRC_UNAVAILABLE':
      return { ...activity, ...NO_INTERPRETATION, edition: null }
    case 'PENDING_REFRESH':
      return activity.status === null ? { ...activity, ...NO_INTERPRETATION, anaf: activity.anaf && { ...activity.anaf, ...NO_TOKEN } } : activity
    case 'CURRENT':
      return activity
  }
}

/**
 * An integrity hold exactly as the API serves it: under any non-current
 * currentness (pending, or the higher-priority ONRC unavailable / source
 * withdrawn, which the hold may accompany), with no interpretation, and
 * either no ANAF object (withdrawn) or none of its token-derived fields. A
 * current one, or one with a status, key, candidate, basis, correction or
 * token, is unreadable — never a held source shown with a code or a key.
 */
function heldAsServed(activity: CompanyMainActivity): boolean {
  if (!activity.integrityHeld) return true
  if (activity.currentness === 'CURRENT') return false
  if (Object.keys(NO_INTERPRETATION).some((field) => activity[field as keyof typeof NO_INTERPRETATION] !== null)) return false
  const anaf = activity.anaf
  return anaf === null || Object.keys(NO_TOKEN).every((field) => anaf[field as keyof typeof NO_TOKEN] === null)
}

/**
 * Whether an assignment holds together under the page's registry: a status
 * for a current one (unless its ANAF source is withdrawn, which leaves no
 * interpretation); a selected key exactly for the selecting statuses; no
 * ONRC interpretation under a registry that is not published; a current one
 * only in the pinned, published edition. A pending one without a status is
 * the interpretation withheld — valid, never malformed.
 */
function mainHoldsTogether(activity: CompanyMainActivity, registry: CompanyRegistryEnvelope): boolean {
  if (activity.currentness === 'CURRENT' && activity.status === null && !activity.anafWithdrawn) return false
  if (activity.status !== null && COMPANY_MAIN_ACTIVITY_SELECTING_STATUSES.has(activity.status) !== (activity.resolved !== null)) return false
  if (registry.state !== 'published' && (activity.resolved !== null || activity.candidates !== null)) return false
  if (activity.currentness === 'CURRENT') {
    if (registry.state !== 'published' || registry.editionId === null || activity.edition?.editionId !== registry.editionId) return false
  }
  return true
}

/**
 * `Company.mainActivity`, fail closed: parsed strictly (an unknown enum value
 * is unreadable, never a nearby one), the policy this client words, an
 * activity exactly when ASSIGNED, an integrity hold only in its served
 * shape, the API's suppression re-applied,
 * and an assignment that holds together under the pinned registry.
 */
export function mapMainActivity(raw: unknown, registry: CompanyRegistryEnvelope): MappedMainActivity {
  if (raw === undefined || raw === null) return MAIN_NOT_SERVED
  const parsed = companyMainActivityReadSchema.safeParse(raw)
  if (!parsed.success) return MAIN_UNREADABLE
  const read = parsed.data
  if ((read.availability === 'ASSIGNED') !== (read.activity !== null)) return MAIN_UNREADABLE
  if (read.activity === null) return { read, unreadable: false }
  // Contract v2: a readable policy and basis, and coherent time provenance of
  // the visible ANAF evidence (a withdrawn source has none to judge).
  const provenance = { ...read.activity, anaf: read.activity.anafWithdrawn ? null : read.activity.anaf }
  if (!mainActivityProvenanceReadable(provenance) || !heldAsServed(read.activity)) return MAIN_UNREADABLE
  const activity = withheld(read.activity)
  if (!mainHoldsTogether(activity, registry)) return MAIN_UNREADABLE
  return { read: { ...read, activity }, unreadable: false }
}

/** The assignment whose flags a CAEN row may carry: current, in the pinned published edition, its ANAF source public. */
function flaggingAssignment(main: MappedMainActivity, registry: CompanyRegistryEnvelope): CompanyMainActivity | null {
  const activity = main.read?.activity ?? null
  if (activity?.currentness !== 'CURRENT' || activity.anafWithdrawn || registry.state !== 'published' || activity.edition?.editionId !== registry.editionId) return null
  return activity
}

type RawCaenActivity = RawCompany['caenActivities'][number]

/**
 * A row's main flags: the API's own, on an ONRC class row while the
 * assignment is current in the pinned edition; null on every other row
 * (ANAF's, a short token, an unknown revision, no current assignment). A row
 * an older API (or document) serves without them stays without them.
 */
export function mainFlagsOf(
  activity: Pick<RawCaenActivity, 'isMainCaen' | 'matchesAssumedMainCode'>,
  source: PrivateCompanyCaenActivity['source'],
  classState: PrivateCompanyCaenActivity['classState'],
  flagging: CompanyMainActivity | null,
): Pick<PrivateCompanyCaenActivity, 'isMainCaen' | 'matchesAssumedMainCode'> {
  if (activity.isMainCaen === undefined && activity.matchesAssumedMainCode === undefined) return {}
  if (flagging === null || source !== 'onrc' || classState !== 'class') return { isMainCaen: null, matchesAssumedMainCode: null }
  return { isMainCaen: activity.isMainCaen ?? null, matchesAssumedMainCode: activity.matchesAssumedMainCode ?? null }
}

/**
 * Every class row carries both flags, or none does: the API serves them null
 * under a current assignment when its bounded flag list is unavailable or
 * over its bound — unknown, so no row keeps one (nothing is inferred from
 * the rest).
 */
function flagsKnown(rows: readonly PrivateCompanyCaenActivity[]): boolean {
  return rows.every((row) => row.source !== 'onrc' || row.classState !== 'class' || (row.isMainCaen !== null && row.matchesAssumedMainCode !== null))
}

/** Every row flagged main is the assignment's selected key (and there is one): otherwise header and list would disagree. */
function flagsAgree(rows: readonly PrivateCompanyCaenActivity[], flagging: CompanyMainActivity | null): boolean {
  const key = flagging?.resolved ?? null
  return rows.every((row) => row.isMainCaen !== true || (key !== null && row.rev === key.revision && row.code === key.code))
}

/**
 * `summary` arrives as a JSON object of Money strings. Only the 16 metrics the
 * four headline fields don't already carry are modelled; a missing key and an
 * explicit null both mean "not reported", never zero.
 */
function mapFinancialSummary(
  raw: RawCompanyFinancialYear['summary'],
): PrivateCompanyFinancialSummary | null {
  if (!raw) return null
  const read = (key: string) => toNumberOrNull(raw[key] ?? null)
  return {
    totalRevenue: read('totalRevenue'),
    totalExpenses: read('totalExpenses'),
    grossProfit: read('grossProfit'),
    grossLoss: read('grossLoss'),
    receivables: read('receivables'),
    currentAssets: read('currentAssets'),
    fixedAssets: read('fixedAssets'),
    cashAndBank: read('cashAndBank'),
    prepaidExpenses: read('prepaidExpenses'),
    deferredIncome: read('deferredIncome'),
    subscribedCapital: read('subscribedCapital'),
    inventories: read('inventories'),
    debts: read('debts'),
    provisions: read('provisions'),
    totalEquity: read('totalEquity'),
    patrimonyRegie: read('patrimonyRegie'),
  }
}

function mapPublisher(raw: string | null | undefined): PrivateCompanyStatementPublisher | null {
  const publisher = raw?.toLowerCase()
  return publisher === 'anaf' || publisher === 'mfp' ? publisher : null
}

/**
 * A Money/BigInt value as the exact text the API sent. The API sends these
 * scalars as strings; a JSON number has already been through a double (it may
 * be rounded), so it is no exact original and stays unavailable.
 */
function exactText(value: string | number | null | undefined): string | null {
  if (typeof value !== 'string') return null
  return value.trim() === '' ? null : value
}

/** Every source metric's exact text: the four headline fields and the summary's 16. */
function mapOriginals(year: RawCompanyFinancialYear): Record<FinancialSourceMetric, string | null> {
  const originals = Object.fromEntries(FINANCIAL_SOURCE_METRICS.map((metric) => [metric, null])) as Record<FinancialSourceMetric, string | null>
  originals.turnover = exactText(year.turnover)
  originals.net_profit = exactText(year.netProfit)
  originals.net_loss = exactText(year.netLoss)
  originals.employees = exactText(year.employees)
  for (const [key, metric] of Object.entries(SUMMARY_METRICS) as [keyof PrivateCompanyFinancialSummary, FinancialSourceMetric][]) {
    originals[metric] = exactText(year.summary?.[key] ?? null)
  }
  return originals
}

const PLAIN_DECIMAL = /^-?\d+(?:\.\d+)?$/u

function metricStatusOf(raw: string | null | undefined): PrivateCompanyMetricStatus | null {
  const parsed = privateCompanyMetricStatusSchema.safeParse(raw?.toLowerCase())
  return parsed.success ? parsed.data : null
}

/**
 * The statement's qualification, fail closed: no qualification, an unknown
 * evaluator, an incomplete or unknown status list, or a net value that does
 * not match its status is `not_assessed` — never read as reported.
 */
function mapQualification(raw: RawStatementQualification | null | undefined): PrivateCompanyStatementQualification {
  if (!raw) return notAssessed('qualification_missing')
  const identity = {
    releaseId: raw.releaseId,
    policyVersion: raw.policyVersion,
    policySha256: raw.policySha256,
    policyApprovedOn: raw.policyApprovedOn,
    evaluatorVersion: raw.evaluatorVersion,
    holdReason: raw.holdReason,
    holdDrift: raw.holdDrift,
  }
  const assessment = raw.assessment.toLowerCase()
  if (assessment === 'not_assessed') {
    return { ...notAssessed(raw.reason ?? 'qualification_malformed'), ...identity }
  }
  const malformed = { ...notAssessed('qualification_malformed'), ...identity }
  if (assessment !== 'assessed' || raw.evaluatorVersion !== QUALIFICATION_EVALUATOR) return malformed
  const statuses: Partial<Record<(typeof FINANCIAL_METRICS)[number], PrivateCompanyMetricStatus>> = {}
  for (const entry of raw.metrics) {
    const status = metricStatusOf(entry.status)
    const metric = FINANCIAL_METRICS.find((name) => name === entry.metric)
    if (status === null || metric === undefined || statuses[metric] !== undefined) return malformed
    statuses[metric] = status
  }
  if (FINANCIAL_METRICS.some((metric) => statuses[metric] === undefined)) return malformed
  const netStatus = metricStatusOf(raw.netResultStatus)
  const net = exactText(raw.netResult)
  if (netStatus !== statuses.net_result) return malformed
  if ((netStatus === 'reported') !== (net !== null) || (net !== null && !PLAIN_DECIMAL.test(net))) return malformed
  return {
    assessment: 'assessed',
    reason: null,
    ...identity,
    statuses: statuses as Record<(typeof FINANCIAL_METRICS)[number], PrivateCompanyMetricStatus>,
    netResult: net,
  }
}

function mapStatementSource(raw: RawCompanyFinancialYear['source']): PrivateCompanyStatementSource | null {
  if (!raw) return null
  const urlKind = raw.urlKind === 'anaf_statement' || raw.urlKind === 'mfp_resource' ? raw.urlKind : null
  return {
    // A URL only with the kind that says which publisher's it is.
    url: urlKind === null ? null : raw.url,
    urlKind,
    statementProfileHash: raw.statementProfileHash,
    metricRuleVersion: raw.metricRuleVersion,
    selectionBasis: raw.selectionBasis ?? null,
    contributingSources:
      raw.contributingSources?.map((line) => ({
        rowNumber: line.rowNumber,
        // A file link only as an https URL: never another scheme.
        url: line.url?.startsWith('https://') ? line.url : null,
        indicators: line.indicators,
      })) ?? null,
  }
}

function mapFinancialYear(year: RawCompanyFinancialYear): PrivateCompanyFinancialYear {
  // A reported zero stays 0 on both sides of the profit/loss pair: "0.00" beside
  // "0.00" is a break-even year, not a missing result. Only an absent value is
  // null. The numbers are the source's, for display; a figure reads a value
  // only through the qualification (`reportedNumber`, `qualifiedNet`).
  return {
    fiscalYear: year.year,
    sourceSystem: mapPublisher(year.sourceSystem),
    turnover: toNumberOrNull(year.turnover),
    netProfit: toNumberOrNull(year.netProfit),
    netLoss: toNumberOrNull(year.netLoss),
    employees: toNumberOrNull(year.employees),
    currency: 'RON',
    summary: mapFinancialSummary(year.summary),
    originals: mapOriginals(year),
    source: mapStatementSource(year.source),
    qualification: mapQualification(year.qualification),
  }
}

/**
 * The server owns the delta arithmetic (see the companies module's
 * `usecases`): only values the evaluator reported in both years under one
 * policy, the net from the evaluator's own net result; a null delta names its
 * reason.
 */
function mapTrajectory(
  raw: CompanyProfileResponse['companyFinancials'],
): PrivateCompanyFinancialTrajectory | null {
  const trajectory = raw?.trajectory
  if (!trajectory) return null
  return {
    fromYear: trajectory.fromYear,
    toYear: trajectory.toYear,
    turnoverDelta: toNumberOrNull(trajectory.turnoverDelta),
    netResultDelta: toNumberOrNull(trajectory.netResultDelta),
    employeesDelta: toNumberOrNull(trajectory.employeesDelta),
    turnoverDeltaReason: trajectory.turnoverDeltaReason ?? null,
    netResultDeltaReason: trajectory.netResultDeltaReason ?? null,
    employeesDeltaReason: trajectory.employeesDeltaReason ?? null,
  }
}

/** Only a web address is linked: anything else a response holds is no link. */
const HTTPS_URL = /^https:\/\/\S+$/u

/**
 * The long-format-only statements as served: year, publisher, verbatim class,
 * anchor capture and file — no figure, no row. Absent or null (no answer, a
 * recorded answer without the field, an unreadable ledger) stays null: unknown,
 * never an empty list.
 */
function mapLongFormStatements(raw: readonly RawLongFormStatement[] | null | undefined): PrivateCompanyLongFormStatement[] | null {
  if (raw == null) return null
  return raw.map((statement) => ({
    fiscalYear: statement.year,
    publisher: mapPublisher(statement.sourceSystem),
    filerClass: statement.filerClass,
    sourceSnapshotId: statement.sourceSnapshotId,
    resourceUrl: statement.resourceUrl !== null && HTTPS_URL.test(statement.resourceUrl) ? statement.resourceUrl : null,
  }))
}

/**
 * Public money received as a payee. Null (not a zeroed object) when the company
 * appears in no flow at all, so the UI can stay silent instead of asserting 0.
 */
function mapPublicMoney(company: RawCompany): PrivateCompanyPublicMoney | null {
  const money = company.publicMoney
  if (!money) return null
  const byFlowType = money.byFlowType.map((flow) => ({
    flowType: flow.flowType,
    // Never `?? 0`: an unreadable total is unknown. Asserting that a company
    // received exactly nothing under an instrument is a claim, not a fallback.
    totalRon: toNumberOrNull(flow.totalRon),
    count: flow.count,
  }))
  const byYear = money.byYear.map((row) => ({
    year: row.year,
    flowType: row.flowType,
    totalRon: toNumberOrNull(row.totalRon),
    count: row.count,
  }))
  const totalRon = toNumberOrNull(money.totalRon)
  // A header total we could not parse says nothing about the per-flow rows,
  // which come from an independent aggregation — keep them.
  if (totalRon === null && byFlowType.length === 0) return null
  return { totalRon, flowCount: money.flowCount, byFlowType, byYear }
}

function buildSources(company: RawCompany, registry: CompanyRegistryEnvelope): PrivateCompanySource[] {
  const sources: PrivateCompanySource[] = []
  // ONRC's date is the pinned edition's publication date, and only for a published one.
  const onrcDate = registry.state === 'published' ? company.asOf.onrc : null
  if (onrcDate) {
    sources.push({ id: 'onrc', snapshotDate: onrcDate })
  }
  const anafDate = company.asOf.anaf ?? company.fiscal?.asOf ?? null
  if (anafDate) {
    sources.push({ id: 'anaf', snapshotDate: anafDate })
  }
  return sources
}

/**
 * ANAF "found" only on ANAF's own evidence: its fiscal record (a state date or
 * any fiscal field) or a statement ANAF published. Statements the Ministry of
 * Finance published for FY2008–2018, or whose publisher is unknown, say nothing
 * about ANAF.
 */
function deriveAnafFound(
  company: RawCompany,
  financials: PrivateCompanyFinancialYear[],
): boolean {
  if (financials.some((year) => year.sourceSystem === 'anaf')) return true
  if (company.asOf.anaf) return true
  const fiscal = company.fiscal
  if (!fiscal) return false
  return (
    fiscal.vatPayer != null ||
    fiscal.declaredFiscallyInactive != null ||
    fiscal.mainCaenCode != null ||
    fiscal.asOf != null
  )
}

export function mapCompanyProfile(
  response: CompanyProfileResponse,
): PrivateCompanyProfile | null {
  const company = response.company
  if (!company) return null

  const financials = (response.companyFinancials?.years ?? []).map(mapFinancialYear)
  const anafFound = deriveAnafFound(company, financials)
  const fiscal = company.fiscal
  const registry = mapRegistryEvidence(company.registry)
  // The edition's qualified fields exist only for a CUI the pinned edition holds.
  const inEdition = registry.cuiState === 'in_edition'

  const fiscalCaen =
    fiscal?.mainCaenCode != null
      ? { code: fiscal.mainCaenCode, rev: fiscal.mainCaenRev || null }
      : null

  const mappedMain = mapMainActivity(company.mainActivity, registry.registry)
  const flagging = flaggingAssignment(mappedMain, registry.registry)
  const caenActivities = company.caenActivities.flatMap((activity): PrivateCompanyCaenActivity[] => {
    const source = mapCaenSource(activity.source)
    // ANAF's declared activity is its own source and stays; the edition's only inside it.
    if (source === null || (source === 'onrc' && !inEdition)) return []
    const classState = source === 'onrc' ? mapCaenClassState(activity.classState) : null
    // A label only beside the row's own known revision, from the current catalog — and only on a class row when the API says which.
    const labelled = Boolean(activity.rev) && activity.label !== null && (classState === null || classState === 'class')
    return [{
      code: activity.code,
      rev: activity.rev || null,
      label: labelled ? activity.label : null,
      source,
      labelSource: labelled ? ('current_db_catalog' as const) : null,
      classState,
      ...mainFlagsOf(activity, source, classState, flagging),
    }]
  })
  // Flags that name another key than the assignment's: neither is kept, and the main block says it cannot be read.
  const agree = flagsAgree(caenActivities, flagging)
  const main = agree ? mappedMain : MAIN_UNREADABLE
  const rows = agree && flagsKnown(caenActivities) ? caenActivities : caenActivities.map((row) => ('isMainCaen' in row || 'matchesAssumedMainCode' in row ? { ...row, isMainCaen: null, matchesAssumedMainCode: null } : row))

  return {
    organizationId: `org:${company.orgId}`,
    cui: company.cui,
    codInmatriculare: inEdition ? company.codInmatriculare : null,
    legalName: company.name,
    nameSource: inEdition ? mapNameSource(company.nameSource) : 'core_organization',
    legalForm: inEdition ? company.legalForm : null,
    registrationDate: inEdition && company.registrationDatePresent ? company.registrationDate : null,
    status: inEdition ? mapStatus(company.headlineStatus) : null,
    address: {
      // No address is served: the display stays empty whatever a response says.
      display: '',
      county: inEdition ? company.address.county : null,
      locality: null,
    },
    geography: inEdition && company.territory
      ? {
          uatSirutaCode: company.territory.sirutaCode ?? '',
          uatName: company.territory.uatName ?? '',
          countyName: company.territory.countyName ?? '',
          matchConfidence: mapMatchConfidence(company.territory.matchConfidence),
        }
      : null,
    caenActivities: rows,
    activitySelection: mapActivitySelection(company.activitySelection, registry.registry),
    ...(main.read !== undefined ? { mainActivity: main.read } : {}),
    ...(main.unreadable ? { mainActivityUnreadable: true } : {}),
    representatives: company.representatives.map((rep) => ({
      name: rep.name,
      role: rep.role,
    })),
    euBranches: company.euBranches.map((branch) => ({
      name: branch.branchName ?? branch.euid ?? '',
      country: branch.country ?? '',
      type: null,
    })),
    fiscal: {
      vatPayer: fiscal?.vatPayer ?? null,
      inactive: fiscal?.declaredFiscallyInactive ?? null,
      anafFound,
      asOfDate: company.asOf.anaf ?? fiscal?.asOf ?? null,
      fiscalCaen,
    },
    financials,
    longFormStatements: mapLongFormStatements(response.companyFinancials?.longFormOnly),
    financialTrajectory: mapTrajectory(response.companyFinancials),
    publicMoney: mapPublicMoney(company),
    sources: buildSources(company, registry.registry),
    registry,
  }
}

// ---------------------------------------------------------------------------
// Resolve answer
// ---------------------------------------------------------------------------

const RESOLVE_DIMS: readonly CompanyResolveDim[] = ['NAME', 'REGNUM', 'CAEN', 'COUNTY']

/** A hit's attribution as served; one this client does not know is none, never another guessed. */
function mapResolveLabelSource(raw: string | null | undefined): CompanyResolveLabelSource | null {
  const lowered = raw?.toLowerCase()
  return COMPANY_RESOLVE_LABEL_SOURCES.find((source) => source === lowered) ?? null
}

/**
 * A resolve answer as served: every hit with its own dimension, its own CAEN
 * revision and key (never normalised into another), and its attribution;
 * `degraded` kept apart from an empty answer; the registry envelope only
 * where one was served. Whether the answer may be used is the API layer's
 * check (`acceptCompanyResolveResult`).
 */
export function mapCompanyResolveResult(raw: RawCompanyResolveResult): CompanyResolveResult {
  return {
    hits: raw.hits.map((hit) => {
      const dim = RESOLVE_DIMS.find((known) => known === hit.dim.toUpperCase())
      if (!dim) throw new Error(`companyResolveResult answered a hit of an unknown dimension: ${hit.dim}`)
      return {
        dim,
        cui: hit.cui,
        label: hit.label,
        value: hit.value,
        confidence: hit.confidence,
        revision: hit.revision ?? null,
        key: hit.key ?? null,
        labelSource: mapResolveLabelSource(hit.labelSource),
      }
    }),
    degraded: raw.degraded,
    ambiguous: raw.ambiguous,
    registry: raw.registry ? mapRegistryEnvelope(raw.registry) : null,
    scopeKey: raw.scopeKey,
  }
}
