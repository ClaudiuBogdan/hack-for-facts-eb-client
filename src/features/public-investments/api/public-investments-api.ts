/**
 * Public Investments — feature API.
 *
 * Mock-first: fixture data is served only under mock mode
 * (`VITE_USE_MOCK_DATA=true` or `VITE_MOCK_DATASETS` includes any of the
 * public-investments dataset ids). When mock mode is off the API returns a
 * typed `blocked` result so hooks/pages can render a blocked state — never
 * throws, never silently serves mocks.
 *
 * The adapter is the trust boundary (PI-1 / money precision) and the privacy
 * boundary (party gating + evidence redaction). Every aggregate it returns
 * excludes `suspect_x1000` amounts; every party list it returns is filtered to
 * publicly servable parties; every evidence excerpt is scrubbed of gated
 * person-like names.
 */

import type {
  PublicInvestmentsSearchState,
  PublicInvestmentsTerritorySearchState,
  PaymentSort,
  SortOrder,
} from '@/schemas/public-investments'
import type {
  BlockedDataResult,
  ContractFact,
  DataResult,
  EvidenceDetail,
  LandingData,
  ObjectiveDetail,
  ObjectiveDetailBundle,
  ObjectiveSearchResult,
  ObjectiveSummary,
  Party,
  PaymentsLedgerData,
  ProgramCode,
  SearchFacets,
  StageBucket,
  TerritoryData,
} from '../lib/types'
import {
  compareObjectives,
  comparePayments,
  computeAbsorptionPct,
  computeTrustedMoneyTotal,
  isMoneySuspect,
} from '../lib/formatting'
import {
  MOCK_COUNTY_TERRITORY_DATA,
  MOCK_EVIDENCE_DETAILS,
  MOCK_LANDING_DATA,
  MOCK_LOCALITY_TERRITORY_DATA,
  MOCK_OBJECTIVE_DETAIL_BUNDLES,
  MOCK_OBJECTIVE_SUMMARIES,
  MOCK_PROGRAM_COVERAGE,
  PUBLIC_INVESTMENTS_MOCK_STATUS,
} from '../mocks/public-investments-mock-data'
import {
  computeTopStalled,
  filterSortPaginateObjectives,
  isPartyPubliclyServable,
  REDACTED_NAME_MARKER,
  REDACTED_NAME_MARKER_KEY,
  redactEvidencePayload,
  redactRelatedLinks,
} from '../lib/filters'
import { isPublicInvestmentsMockEnabled } from '../lib/mock-mode'

const PROGRAM_CODE_ORDER: readonly ProgramCode[] = [
  'ANGHEL_SALIGNY',
  'PNDL',
  'PNCCRS',
  'PNMC',
]

const STAGE_BUCKET_ORDER: readonly StageBucket[] = [
  'contractat',
  'in_executie',
  'finalizat',
  'receptionat',
  'necunoscut',
]

// ---------------------------------------------------------------------------
// Blocked result helpers
// ---------------------------------------------------------------------------

function blockedResult(
  reason: BlockedDataResult['reason'],
  messageKey: string,
  messageParams?: Readonly<Record<string, string | number>>,
): BlockedDataResult {
  return {
    kind: 'blocked',
    reason,
    status: reason,
    messageKey,
    messageParams,
  }
}

const LIVE_NOT_CONNECTED_RESULT = blockedResult(
  'live-not-connected',
  'publicInvestments.blocked.liveNotConnected',
)

const NOT_FOUND_RESULT = blockedResult(
  'not-found',
  'publicInvestments.blocked.objectiveNotFound',
)

function hasSuspectAmount(objective: ObjectiveSummary): boolean {
  return (
    isMoneySuspect(objective.allocated) ||
    isMoneySuspect(objective.contracted) ||
    isMoneySuspect(objective.reimbursed)
  )
}

function hasPrecisionWarningAmount(objective: ObjectiveSummary): boolean {
  return (
    objective.allocated?.confidence === 'precision_warning' ||
    objective.contracted?.confidence === 'precision_warning' ||
    objective.reimbursed?.confidence === 'precision_warning'
  )
}

function buildMapPoints(objectives: readonly ObjectiveSummary[]) {
  return objectives.map((objective) => ({
    objectiveId: objective.objectiveId,
    program: objective.program,
    title: objective.title,
    county: objective.county,
    uat: objective.uat,
    siruta: objective.siruta,
    lat: objective.lat,
    lng: objective.lng,
    contracted:
      objective.contracted && isMoneySuspect(objective.contracted)
        ? { ...objective.contracted, amount: null }
        : objective.contracted,
    absorptionPct:
      isMoneySuspect(objective.contracted) || isMoneySuspect(objective.reimbursed)
        ? null
        : objective.absorptionPct,
    stage: objective.stage,
  }))
}

function getObjectivePartyContext(objectiveId: string): readonly Party[] {
  return MOCK_OBJECTIVE_DETAIL_BUNDLES[objectiveId]?.parties ?? []
}

function sanitizeSearchTokensForPublic(
  tokens: readonly string[] | undefined,
  partyContext: readonly Party[],
): readonly string[] | undefined {
  if (!tokens || tokens.length === 0) return tokens

  const gatedParties = partyContext.filter((party) => !isPartyPubliclyServable(party))
  if (gatedParties.length === 0) return tokens
  return []
}

function sanitizeSummaryForPublic(objective: ObjectiveSummary): ObjectiveSummary {
  const partyContext = getObjectivePartyContext(objective.objectiveId)
  if (partyContext.length === 0) return objective

  return {
    ...objective,
    searchTokens: sanitizeSearchTokensForPublic(
      objective.searchTokens,
      partyContext,
    ),
  }
}

function getPublicObjectiveSummaries(): readonly ObjectiveSummary[] {
  return MOCK_OBJECTIVE_SUMMARIES.map(sanitizeSummaryForPublic)
}

function sanitizeObjectiveRowsForPublic(
  objectives: readonly ObjectiveSummary[],
): readonly ObjectiveSummary[] {
  return objectives.map(sanitizeSummaryForPublic)
}

function sanitizePartyForPublic(party: Party | null): Party | null {
  if (!party) return null
  if (isPartyPubliclyServable(party)) return party

  return {
    ...party,
    displayName: null,
    cui: null,
    served: false,
  }
}

function sanitizeContractForPublic(contract: ContractFact): ContractFact {
  return {
    ...contract,
    contractor: sanitizePartyForPublic(contract.contractor),
    designer: sanitizePartyForPublic(contract.designer),
    beneficiary: sanitizePartyForPublic(contract.beneficiary),
  }
}

function sanitizeObjectiveForPublic(
  objective: ObjectiveDetail,
  parties: readonly Party[],
): ObjectiveDetail {
  const gatedCuis = new Set(
    parties
      .filter((party) => !isPartyPubliclyServable(party))
      .map((party) => party.cui)
      .filter((cui): cui is string => Boolean(cui)),
  )

  return {
    ...objective,
    searchTokens: sanitizeSearchTokensForPublic(objective.searchTokens, parties),
    beneficiary: sanitizePartyForPublic(objective.beneficiary),
    relatedLinks: redactRelatedLinks(objective.relatedLinks, parties).filter(
      (link) => !link.cui || !gatedCuis.has(link.cui),
    ),
  }
}

function sanitizeBundleForPublic(
  bundle: ObjectiveDetailBundle,
): ObjectiveDetailBundle {
  const sanitizedParties = bundle.parties.map(sanitizePartyForPublic)
  return {
    ...bundle,
    objective: sanitizeObjectiveForPublic(bundle.objective, bundle.parties),
    contracts: bundle.contracts.map(sanitizeContractForPublic),
    parties: sanitizedParties.filter((party): party is Party => party != null),
  }
}

function computeTrustedSummary(
  objectives: readonly ObjectiveSummary[],
): TerritoryData['summary'] {
  const contractedTotal = computeTrustedMoneyTotal(
    objectives.map((objective) => objective.contracted),
  )
  const reimbursedTotal = computeTrustedMoneyTotal(
    objectives.map((objective) => objective.reimbursed),
  )
  const stalledCount = objectives.filter(
    (objective) =>
      (objective.stage.bucket === 'contractat' ||
        objective.stage.bucket === 'in_executie') &&
      objective.absorptionPct != null &&
      objective.absorptionPct <= 50 &&
      !hasSuspectAmount(objective),
  ).length

  return {
    objectiveCount: objectives.length,
    contractedTotal,
    reimbursedTotal,
    absorptionPct: computeAbsorptionPct(contractedTotal, reimbursedTotal),
    stalledCount,
    evidenceRef: objectives[0]?.evidenceRef ?? null,
  }
}

function buildProgramBreakdown(objectives: readonly ObjectiveSummary[]) {
  return PROGRAM_CODE_ORDER.flatMap((program) => {
    const rows = objectives.filter((objective) => objective.program === program)
    if (rows.length === 0) return []
    return [
      {
        program,
        count: rows.length,
        contracted: computeTrustedMoneyTotal(
          rows.map((objective) => objective.contracted),
        ),
        evidenceRef: rows[0]?.evidenceRef ?? null,
      },
    ]
  })
}

function buildDomainBreakdown(objectives: readonly ObjectiveSummary[]) {
  const byDomain = new Map<
    string,
    { label: string; rows: ObjectiveSummary[] }
  >()

  for (const objective of objectives) {
    if (!objective.domainKey || !objective.domain) continue
    const existing = byDomain.get(objective.domainKey)
    if (existing) {
      existing.rows.push(objective)
    } else {
      byDomain.set(objective.domainKey, {
        label: objective.domain,
        rows: [objective],
      })
    }
  }

  return [...byDomain.entries()].map(([key, value]) => ({
    key,
    label: value.label,
    count: value.rows.length,
    contracted: computeTrustedMoneyTotal(
      value.rows.map((objective) => objective.contracted),
    ),
  }))
}

function buildChildUats(objectives: readonly ObjectiveSummary[]) {
  const bySiruta = new Map<
    string,
    { name: string; rows: ObjectiveSummary[] }
  >()

  for (const objective of objectives) {
    if (!objective.siruta || !objective.uat) continue
    const existing = bySiruta.get(objective.siruta)
    if (existing) {
      existing.rows.push(objective)
    } else {
      bySiruta.set(objective.siruta, {
        name: objective.uat,
        rows: [objective],
      })
    }
  }

  return [...bySiruta.entries()]
    .map(([siruta, value]) => {
      const contractedTotal = computeTrustedMoneyTotal(
        value.rows.map((objective) => objective.contracted),
      )
      const reimbursedTotal = computeTrustedMoneyTotal(
        value.rows.map((objective) => objective.reimbursed),
      )
      return {
        siruta,
        name: value.name,
        objectiveCount: value.rows.length,
        absorptionPct: computeAbsorptionPct(contractedTotal, reimbursedTotal),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
}

function isPaymentSuspect(payment: {
  readonly amount: { readonly confidence: string } | null
  readonly requested?: { readonly confidence: string } | null
  readonly reimbursed?: { readonly confidence: string } | null
  readonly cumulative?: { readonly confidence: string } | null
}): boolean {
  return (
    payment.amount?.confidence === 'suspect_x1000' ||
    payment.requested?.confidence === 'suspect_x1000' ||
    payment.reimbursed?.confidence === 'suspect_x1000' ||
    payment.cumulative?.confidence === 'suspect_x1000'
  )
}

function buildPaymentsLedgerData(
  bundle: ObjectiveDetailBundle,
  paySort: PaymentSort = 'date',
  payOrder: SortOrder = 'asc',
): PaymentsLedgerData {
  const payments = [...bundle.payments].sort((a, b) =>
    comparePayments(a, b, paySort, payOrder),
  )
  const suspectCount = payments.filter(isPaymentSuspect).length
  const reimbursedTotal = computeTrustedMoneyTotal(
    payments.map((payment) => payment.reimbursed ?? payment.amount),
  )

  return {
    payments,
    cumulativeSeries: payments.map((payment) => ({
      date: payment.date,
      cumulative: isPaymentSuspect(payment)
        ? null
        : (payment.cumulative?.amount ?? null),
      confidence: isPaymentSuspect(payment)
        ? 'suspect_x1000'
        : (payment.cumulative?.confidence ?? payment.amount.confidence),
    })),
    contractedReference: bundle.objective.contracted,
    totals: {
      reimbursedTotal,
      paymentCount: payments.length,
      suspectCount,
    },
    snapshotDate: bundle.status.snapshotDate,
  }
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

export async function getLandingData(): Promise<DataResult<LandingData>> {
  if (!isPublicInvestmentsMockEnabled()) {
    return LIVE_NOT_CONNECTED_RESULT
  }

  await new Promise((resolve) => setTimeout(resolve, 120))
  const publicSummaries = getPublicObjectiveSummaries()

  // Recompute trusted KPI totals from fixtures so the trust boundary is
  // exercised even when fixtures are edited.
  const trustedContracted = computeTrustedMoneyTotal(
    publicSummaries.map((objective) => objective.contracted),
  )
  const trustedReimbursed = computeTrustedMoneyTotal(
    publicSummaries.map((objective) => objective.reimbursed),
  )

  return {
    kind: 'available',
    data: {
      ...MOCK_LANDING_DATA,
      coverage: MOCK_PROGRAM_COVERAGE,
      kpis: {
        ...MOCK_LANDING_DATA.kpis,
        contractedTotal: trustedContracted,
        reimbursedTotal: trustedReimbursed,
        absorptionPct: computeAbsorptionPct(trustedContracted, trustedReimbursed),
      },
      mapPoints: buildMapPoints(publicSummaries),
      topStalled: computeTopStalled(publicSummaries, 6),
    },
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function buildSearchFacets(
  objectives: readonly ObjectiveSummary[],
): SearchFacets {
  const programs = Object.fromEntries(
    PROGRAM_CODE_ORDER.map((program) => [program, 0]),
  ) as Record<ProgramCode, number>
  const stages = Object.fromEntries(
    STAGE_BUCKET_ORDER.map((stage) => [stage, 0]),
  ) as Record<StageBucket, number>
  const dataQuality = { precision_warning: 0, suspect_x1000: 0 }

  const domainMap = new Map<string, { label: string; count: number }>()
  const countyMap = new Map<string, { name: string; count: number }>()

  for (const objective of objectives) {
    programs[objective.program] = (programs[objective.program] ?? 0) + 1
    stages[objective.stage.bucket] = (stages[objective.stage.bucket] ?? 0) + 1

    if (hasSuspectAmount(objective)) {
      dataQuality.suspect_x1000 += 1
    }
    if (hasPrecisionWarningAmount(objective)) {
      dataQuality.precision_warning += 1
    }

    if (objective.domainKey && objective.domain) {
      const existing = domainMap.get(objective.domainKey)
      if (existing) {
        existing.count += 1
      } else {
        domainMap.set(objective.domainKey, {
          label: objective.domain,
          count: 1,
        })
      }
    }

    const countyKey = objective.countyCode.toUpperCase()
    const existing = countyMap.get(countyKey)
    if (existing) {
      existing.count += 1
    } else {
      countyMap.set(countyKey, { name: objective.county, count: 1 })
    }
  }

  return {
    programs,
    domains: [...domainMap.entries()].map(([key, value]) => ({
      key,
      label: value.label,
      count: value.count,
    })),
    counties: [...countyMap.entries()].map(([code, value]) => ({
      code,
      name: value.name,
      count: value.count,
    })),
    stages,
    dataQuality,
  }
}

export async function searchObjectives(
  search: Partial<PublicInvestmentsSearchState>,
): Promise<DataResult<ObjectiveSearchResult>> {
  if (!isPublicInvestmentsMockEnabled()) {
    return LIVE_NOT_CONNECTED_RESULT
  }

  await new Promise((resolve) => setTimeout(resolve, 120))
  const publicSummaries = getPublicObjectiveSummaries()

  const { rows, total, excludedSuspectCount } = filterSortPaginateObjectives(
    publicSummaries,
    search,
  )

  // mapPoints cover the full filtered set (not just the page).
  const fullFiltered = filterSortPaginateObjectives(publicSummaries, {
    ...search,
    page: 1,
    pageSize: Number.MAX_SAFE_INTEGER,
  })

  const facets = buildSearchFacets(publicSummaries)

  return {
    kind: 'available',
    data: {
      rows,
      total,
      excludedSuspectCount,
      facets,
      mapPoints: buildMapPoints(fullFiltered.rows),
      status: PUBLIC_INVESTMENTS_MOCK_STATUS,
    },
  }
}

// ---------------------------------------------------------------------------
// Objective detail bundle
// ---------------------------------------------------------------------------

export async function getObjectiveBundle(
  objectiveId: string,
): Promise<DataResult<ObjectiveDetailBundle>> {
  if (!isPublicInvestmentsMockEnabled()) {
    return LIVE_NOT_CONNECTED_RESULT
  }

  await new Promise((resolve) => setTimeout(resolve, 120))

  const bundle = MOCK_OBJECTIVE_DETAIL_BUNDLES[objectiveId]
  if (!bundle) {
    return NOT_FOUND_RESULT
  }

  return {
    kind: 'available',
    data: sanitizeBundleForPublic(bundle),
  }
}

export async function getPaymentsLedgerData(
  objectiveId: string,
  paySort: PaymentSort = 'date',
  payOrder: SortOrder = 'asc',
): Promise<DataResult<PaymentsLedgerData>> {
  if (!isPublicInvestmentsMockEnabled()) {
    return LIVE_NOT_CONNECTED_RESULT
  }

  await new Promise((resolve) => setTimeout(resolve, 80))

  const bundle = MOCK_OBJECTIVE_DETAIL_BUNDLES[objectiveId]
  if (!bundle) {
    return NOT_FOUND_RESULT
  }

  return {
    kind: 'available',
    data: buildPaymentsLedgerData(bundle, paySort, payOrder),
  }
}

// ---------------------------------------------------------------------------
// Territory (locality / county)
// ---------------------------------------------------------------------------

export async function getTerritoryData(
  scope: 'locality' | 'county',
  code: string,
  search: Partial<PublicInvestmentsTerritorySearchState> = {},
): Promise<DataResult<TerritoryData>> {
  if (!isPublicInvestmentsMockEnabled()) {
    return LIVE_NOT_CONNECTED_RESULT
  }

  await new Promise((resolve) => setTimeout(resolve, 120))

  const lookup = scope === 'locality' ? MOCK_LOCALITY_TERRITORY_DATA : MOCK_COUNTY_TERRITORY_DATA
  const key = scope === 'locality' ? code : code.toUpperCase()
  const territory = lookup[key]

  if (!territory) {
    return blockedResult(
      'not-found',
      scope === 'locality'
        ? 'publicInvestments.blocked.localityNotFound'
        : 'publicInvestments.blocked.countyNotFound',
      { code: scope === 'locality' ? code : code.toUpperCase() },
    )
  }

  const territoryObjectives = sanitizeObjectiveRowsForPublic(territory.objectives)
  const filtered = filterSortPaginateObjectives(territoryObjectives, {
    programs: search.programs,
    domains: search.domains,
    stages: search.stages,
    sort: search.sort,
    order: search.order,
    page: 1,
    pageSize: Number.MAX_SAFE_INTEGER,
  })
  const objectives = filtered.rows

  return {
    kind: 'available',
    data: {
      ...territory,
      summary: computeTrustedSummary(objectives),
      byProgram: buildProgramBreakdown(objectives),
      byDomain: buildDomainBreakdown(objectives),
      objectives,
      mapPoints: buildMapPoints(objectives),
      childUats:
        territory.scope === 'county'
          ? buildChildUats(objectives)
          : territory.childUats,
    },
  }
}

// ---------------------------------------------------------------------------
// Evidence detail
// ---------------------------------------------------------------------------

/**
 * Raw payload excerpts are scrubbed of gated party names before reaching the
 * UI. The fixture for the gated party objective ships already-redacted; for
 * any caller passing an unscrubbed excerpt, this is the fail-safe that
 * re-applies the redaction marker using the objective's party context.
 */
export async function getEvidenceDetail(
  sourceRowKey: string,
  objectiveId?: string,
): Promise<DataResult<EvidenceDetail>> {
  if (!isPublicInvestmentsMockEnabled()) {
    return LIVE_NOT_CONNECTED_RESULT
  }

  await new Promise((resolve) => setTimeout(resolve, 80))

  const detail = MOCK_EVIDENCE_DETAILS[sourceRowKey]
  if (!detail) {
    return blockedResult(
      'not-found',
      'publicInvestments.blocked.evidenceNotFound',
      { sourceRowKey },
    )
  }

  // The fixture ships the excerpt already-scrubbed for the gated party
  // objective (REDACTED_RAW_PAYLOAD_NAPOCA). As a client fail-safe, re-run the
  // redaction against the objective's party context using any names the party
  // context can still expose (person-like CUIs are withheld even though the
  // displayName is already null). This guarantees no gated identifier leaks
  // even if a future fixture forgets to pre-scrub.
  let redactedExcerpt = detail.rawPayloadExcerpt
  const redactionObjectiveId =
    objectiveId ??
    (detail.evidenceKey && MOCK_OBJECTIVE_DETAIL_BUNDLES[detail.evidenceKey]
      ? detail.evidenceKey
      : undefined)
  if (redactionObjectiveId && redactedExcerpt) {
    const bundle = MOCK_OBJECTIVE_DETAIL_BUNDLES[redactionObjectiveId]
    if (bundle) {
      redactedExcerpt = redactEvidencePayload(redactedExcerpt, bundle.parties)
    }
  }

  return {
    kind: 'available',
    data: {
      ...detail,
      rawPayloadExcerpt: redactedExcerpt,
      redactionMarkerKey: redactedExcerpt?.includes(REDACTED_NAME_MARKER)
        ? REDACTED_NAME_MARKER_KEY
        : (detail.redactionMarkerKey ?? null),
    },
  }
}

// ---------------------------------------------------------------------------
// Live adapter placeholder (slice 1 — not connected)
// ---------------------------------------------------------------------------

/**
 * Live backend is not connected yet (catalog `apiReady: false`). This stub
 * documents the adapter swap point: when the backend lands, replace the mock
 * branch above with a fetch to the GraphQL/REST endpoint and keep the same
 * return type so UI code is unchanged.
 */
export const PUBLIC_INVESTMENTS_LIVE_NOT_CONNECTED_MESSAGE_KEY =
  'publicInvestments.blocked.liveNotConnected'

export { isPublicInvestmentsMockEnabled }

// Re-export comparators for hook-level prefetch/transform use.
export { compareObjectives, computeAbsorptionPct, computeTrustedMoneyTotal }
