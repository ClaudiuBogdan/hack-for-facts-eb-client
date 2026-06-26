/**
 * Public Investments — UI-boundary domain types.
 *
 * Mirrors the serving schema described in
 * `docs/design/public-investments/design.md §6`. Mock fixtures and the live
 * adapter both produce these shapes so swapping the backend is an adapter
 * change, not a UI rewrite. The adapter is the trust boundary (PI-1 / money
 * precision) and the privacy boundary (party gating) — types here reflect the
 * already-scrubbed values that components receive.
 */

import type {
  AmountConfidence,
  IdentityConfidence,
  ProgramCode,
  StageBucket,
} from '@/schemas/public-investments'
import type { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap'

export type {
  AmountConfidence,
  AmountField,
  DataQualityFilter,
  IdentityConfidence,
  LayoutView,
  MapView,
  ObjectiveSort,
  ObjectiveTab,
  ProgramCode,
  PaymentSort,
  SortOrder,
  StageBucket,
} from '@/schemas/public-investments'

/** RON amount carrying the PI-1 / money-precision guard state. */
export type MoneyValue = {
  readonly amount: number | null
  readonly confidence: AmountConfidence
  readonly raw: string | null
}

/** Provenance pointer — drives "Vezi dovada" everywhere. */
export type SourceUrlKind = 'workbook' | 'arcgis_api' | 'dead' | 'unknown'

export type EvidenceRef = {
  readonly sourceRowKey: string
  readonly sourceFileId: string | null
  readonly objectId: string | null
  readonly sourceUrl: string | null
  readonly sourceUrlKind: SourceUrlKind
  readonly snapshotId: string | null
  readonly snapshotDate: string | null
  readonly contentSha256: string | null
  readonly rowHash: string | null
}

export type PartyRole = 'executant' | 'proiectant' | 'beneficiar'
export type PrivacyClass = 'public_aggregate' | 'personal_moderate'
export type PartyReviewState = 'reviewed' | 'unreviewed'

/**
 * Privacy-gated party. `served === false` (or any of the person-like flags)
 * means the adapter withholds it; components must never render `displayName`
 * for a withheld party. `displayName` is `null` when the adapter has already
 * scrubbed a gated name.
 */
export type Party = {
  readonly partyId: string
  readonly role: PartyRole
  readonly displayName: string | null
  readonly cui: string | null
  readonly privacyClass: PrivacyClass
  readonly potentialNaturalPerson: boolean
  readonly reviewState: PartyReviewState
  readonly served: boolean
  readonly evidenceRef: EvidenceRef
}

export type ObjectiveStage = {
  readonly bucket: StageBucket
  readonly raw: string | null
}

export type ObjectiveSummary = {
  readonly objectiveId: string
  readonly program: ProgramCode
  readonly title: string
  readonly domain: string | null
  readonly domainKey: string | null
  readonly county: string
  readonly countyCode: string
  readonly uat: string | null
  readonly siruta: string | null
  readonly lat: number | null
  readonly lng: number | null
  readonly allocated: MoneyValue | null
  readonly contracted: MoneyValue | null
  readonly reimbursed: MoneyValue | null
  /** decontat/contractat, 0..100, null when N/A or when either amount is suspect_x1000. */
  readonly absorptionPct: number | null
  readonly stage: ObjectiveStage
  readonly hasContractorCui: boolean
  readonly hasDesignerCui: boolean
  readonly identityConfidence: IdentityConfidence
  readonly searchTokens?: readonly string[]
  readonly evidenceRef: EvidenceRef
}

export type RelatedLinkKind =
  | 'authority'
  | 'company'
  | 'procurement'
  | 'pnrr'
  | 'territory'

export type RelatedLink = {
  readonly kind: RelatedLinkKind
  readonly cui: string | null
  readonly siruta: string | null
  readonly label: string
  readonly why: string
  readonly verified: boolean
}

export type ObjectiveDetail = ObjectiveSummary & {
  readonly beneficiary: Party | null
  readonly contractorCandidateCount: number
  readonly relatedLinks: readonly RelatedLink[]
}

export type PaymentFact = {
  readonly paymentId: string
  readonly date: string | null
  readonly amount: MoneyValue
  readonly requested: MoneyValue | null
  readonly reimbursed: MoneyValue | null
  readonly cumulative: MoneyValue | null
  readonly evidenceRef: EvidenceRef
}

export type PaymentsLedgerPoint = {
  readonly date: string | null
  readonly cumulative: number | null
  readonly confidence: AmountConfidence
}

export type PaymentsLedgerData = {
  readonly payments: readonly PaymentFact[]
  readonly cumulativeSeries: readonly PaymentsLedgerPoint[]
  readonly contractedReference: MoneyValue | null
  readonly totals: {
    readonly reimbursedTotal: MoneyValue
    readonly paymentCount: number
    readonly suspectCount: number
  }
  readonly snapshotDate: string | null
}

export type ContractFact = {
  readonly contractId: string
  readonly contractNumber: string | null
  readonly contractDate: string | null
  readonly contractor: Party | null
  readonly designer: Party | null
  readonly beneficiary: Party | null
  readonly value: MoneyValue | null
  readonly evidenceRef: EvidenceRef
}

export type StageFact = {
  readonly snapshotId: string
  readonly snapshotDate: string | null
  readonly bucket: StageBucket
  readonly raw: string | null
  readonly evidenceRef: EvidenceRef
}

export type ProgramCoverage = {
  readonly program: ProgramCode
  readonly objectiveCount: number
  readonly loaded: boolean
  readonly note: string | null
}

export type DomainDataStatus = {
  readonly snapshotDate: string
  readonly validationGate: 'ok' | 'warning'
  readonly moneyPrecisionWarningRows: number
  readonly inflationBugActive: boolean
  readonly historyAvailable: boolean
}

// Map point subset — reused by landing, search, territory.
export type ObjectiveMapPoint = Pick<
  ObjectiveSummary,
  | 'objectiveId'
  | 'program'
  | 'title'
  | 'county'
  | 'uat'
  | 'siruta'
  | 'lat'
  | 'lng'
  | 'contracted'
  | 'absorptionPct'
  | 'stage'
>

export type LandingKpis = {
  readonly objectiveCount: number
  readonly mappedObjectiveCount: number
  readonly unmappedObjectiveCount: number
  readonly contractedTotal: MoneyValue
  readonly reimbursedTotal: MoneyValue
  readonly absorptionPct: number | null
  readonly evidenceRef: EvidenceRef
}

export type LandingData = {
  readonly status: DomainDataStatus
  readonly coverage: readonly ProgramCoverage[]
  readonly kpis: LandingKpis
  readonly mapPoints: readonly ObjectiveMapPoint[]
  readonly topStalled: readonly ObjectiveSummary[]
}

export type SearchFacets = {
  readonly programs: Readonly<Record<ProgramCode, number>>
  readonly domains: ReadonlyArray<{
    readonly key: string
    readonly label: string
    readonly count: number
  }>
  readonly counties: ReadonlyArray<{
    readonly code: string
    readonly name: string
    readonly count: number
  }>
  readonly stages: Readonly<Record<StageBucket, number>>
  readonly dataQuality: { readonly precision_warning: number; readonly suspect_x1000: number }
}

export type ObjectiveSearchResult = {
  readonly rows: readonly ObjectiveSummary[]
  readonly total: number
  readonly excludedSuspectCount: number
  readonly facets: SearchFacets
  readonly mapPoints: readonly ObjectiveMapPoint[]
  readonly status: DomainDataStatus
}

export type ObjectiveDetailBundle = {
  readonly objective: ObjectiveDetail
  readonly payments: readonly PaymentFact[]
  readonly contracts: readonly ContractFact[]
  readonly stages: readonly StageFact[]
  readonly parties: readonly Party[]
  readonly status: DomainDataStatus
}

export type TerritoryScope = 'locality' | 'county'

export type TerritoryAuthority = {
  readonly cui: string | null
  readonly name: string | null
  readonly isPrimarie: boolean
  readonly evidenceRef: EvidenceRef | null
}

export type TerritorySummary = {
  readonly objectiveCount: number
  readonly contractedTotal: MoneyValue
  readonly reimbursedTotal: MoneyValue
  readonly absorptionPct: number | null
  readonly stalledCount: number
  readonly evidenceRef?: EvidenceRef | null
}

export type TerritoryProgramBreakdown = {
  readonly program: ProgramCode
  readonly count: number
  readonly contracted: MoneyValue
  readonly evidenceRef?: EvidenceRef | null
}

export type TerritoryDomainBreakdown = {
  readonly key: string
  readonly label: string
  readonly count: number
  readonly contracted: MoneyValue
}

export type TerritoryChildUat = {
  readonly siruta: string
  readonly name: string
  readonly objectiveCount: number
  readonly absorptionPct: number | null
}

export type TerritoryData = {
  readonly scope: TerritoryScope
  readonly siruta: string | null
  readonly countyCode: string
  readonly countyName: string
  readonly localityName: string | null
  readonly authority: TerritoryAuthority | null
  readonly summary: TerritorySummary
  readonly byProgram: readonly TerritoryProgramBreakdown[]
  readonly byDomain: readonly TerritoryDomainBreakdown[]
  readonly objectives: readonly ObjectiveSummary[]
  readonly mapPoints: readonly ObjectiveMapPoint[]
  readonly childUats?: readonly TerritoryChildUat[]
  readonly status: DomainDataStatus
}

export type EvidenceLinkHealth = 'ok' | 'dead' | 'unknown'

export type EvidenceDetail = {
  readonly ref: EvidenceRef
  readonly sourceFileName: string | null
  readonly evidenceTable: string | null
  readonly evidenceKey: string | null
  /** Pre-scrubbed by the adapter; gated party fields are already redacted. */
  readonly rawPayloadExcerpt: string | null
  /** Message key used by the UI to localize any redaction token in the excerpt. */
  readonly redactionMarkerKey?: string | null
  readonly amountConfidence: AmountConfidence | null
  readonly amountRaw: string | null
  readonly linkHealth: EvidenceLinkHealth
}

// Heatmap rows — adapter emits shapes typed to the existing heatmap schema so
// the analytics dashboard (N3) can reuse the choropleth rendering directly.
export type PublicInvestmentsHeatmapUatRow = HeatmapUATDataPoint
export type PublicInvestmentsHeatmapCountyRow = HeatmapCountyDataPoint

// ---------------------------------------------------------------------------
// Data availability / mock-gating result (the only thing hooks return when
// mock mode is off — never thrown).
// ---------------------------------------------------------------------------

export type DataAvailabilityStatus =
  | 'mock-disabled'
  | 'live-not-connected'
  | 'dataset-not-configured'
  | 'not-found'

export type BlockedDataResult = {
  readonly kind: 'blocked'
  readonly reason: DataAvailabilityStatus
  readonly status: DataAvailabilityStatus
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string | number>>
}

export type AvailableDataResult<TData> = {
  readonly kind: 'available'
  readonly data: TData
}

export type DataResult<TData> =
  | AvailableDataResult<TData>
  | BlockedDataResult
