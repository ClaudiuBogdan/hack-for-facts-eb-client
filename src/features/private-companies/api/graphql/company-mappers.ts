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
 */
import {
  FINANCIAL_METRICS,
  FINANCIAL_SOURCE_METRICS,
  privateCompanyMetricStatusSchema,
  type FinancialSourceMetric,
  type PrivateCompanyCaenActivity,
  type PrivateCompanyFinancialSummary,
  type PrivateCompanyFinancialTrajectory,
  type PrivateCompanyFinancialYear,
  type PrivateCompanyMatchConfidence,
  type PrivateCompanyMetricStatus,
  type PrivateCompanyProfile,
  type PrivateCompanyPublicMoney,
  type PrivateCompanySource,
  type PrivateCompanyStatementPublisher,
  type PrivateCompanyStatementQualification,
  type PrivateCompanyStatementSource,
} from '@/schemas/private-company'
import type { CompanyRegistryCuiState, CompanyRegistryEnvelope } from '@/schemas/private-company-registry'
import {
  COMPANY_RESOLVE_LABEL_SOURCES,
  type CompanyResolveDim,
  type CompanyResolveLabelSource,
  type CompanyResolveResult,
  type PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import { notAssessed, QUALIFICATION_EVALUATOR, SUMMARY_METRICS } from '../../lib/financial-qualification'
import type {
  CompanyProfileResponse,
  RawCompany,
  RawCompanyFinancialYear,
  RawCompanyListItem,
  RawCompanyResolveResult,
  RawStatementQualification,
} from './company-queries'
import { mapRegistryBasis, mapRegistryEnvelope, mapRegistryEvidence } from './company-registry-graphql'

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
    caenActivities: company.caenActivities.flatMap((activity) => {
      const source = mapCaenSource(activity.source)
      // ANAF's declared activity is its own source and stays; the edition's only inside it.
      if (source === null || (source === 'onrc' && !inEdition)) return []
      // A label only beside the row's own known revision, from the current catalog.
      const labelled = Boolean(activity.rev) && activity.label !== null
      return [{
        code: activity.code,
        rev: activity.rev || null,
        label: labelled ? activity.label : null,
        source,
        labelSource: labelled ? ('current_db_catalog' as const) : null,
      }]
    }),
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
    financialTrajectory: mapTrajectory(response.companyFinancials),
    publicMoney: mapPublicMoney(company),
    sources: buildSources(company, registry.registry),
    registry,
  }
}

// ---------------------------------------------------------------------------
// Search list item
// ---------------------------------------------------------------------------

/** The canonical search-row shape lives on the result page type. */
export type PrivateCompanySearchResultItem =
  PrivateCompanySearchResultPage['items'][number]

const LIST_CUI_STATES: readonly CompanyRegistryCuiState[] = ['in_edition', 'not_in_edition', 'unpublished', 'withdrawn', 'unavailable']

/** A row of a page under `registry`: its ONRC fields only for a CUI that page's edition holds. */
export function mapCompanyListItem(
  node: RawCompanyListItem,
  registry: CompanyRegistryEnvelope,
): PrivateCompanySearchResultItem {
  const stated = LIST_CUI_STATES.find((state) => state === node.registryCuiState.toLowerCase()) ?? 'unavailable'
  const registryCuiState: CompanyRegistryCuiState = registry.state !== 'published' ? registry.state : stated === 'in_edition' || stated === 'not_in_edition' ? stated : 'unavailable'
  const inEdition = registryCuiState === 'in_edition'
  const basis = (raw: string | null) => (inEdition && raw !== null ? mapRegistryBasis(raw) : null)
  const status = inEdition ? mapStatus(node.headlineStatus) : null
  return {
    cui: node.cui,
    name: node.name,
    nameSource: inEdition ? mapNameSource(node.nameSource) : 'core_organization',
    legalForm: inEdition ? node.legalForm : null,
    status: status ? { code: status.code, label: status.label } : null,
    county: inEdition ? node.county : null,
    vatPayer: node.vatPayer,
    declaredFiscallyInactive: node.declaredFiscallyInactive,
    registrationDate: inEdition && node.registrationDatePresent ? node.registrationDate : null,
    registryCuiState,
    hasActiveObservation: inEdition ? node.hasActiveObservation : null,
    statusBasis: basis(node.statusBasis),
    countyBasis: basis(node.countyBasis),
    recordedDateBasis: basis(node.recordedDateBasis),
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
