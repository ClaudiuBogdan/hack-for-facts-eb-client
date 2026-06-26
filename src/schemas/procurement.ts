import { z } from 'zod'

/**
 * Procurement domain UI-boundary schemas.
 *
 * Shapes mirror the server `procurement` GraphQL module and the analytic
 * rollups (see docs/design/procurement/design.md §6). The adapter maps live
 * responses to these types; mocks use them directly. Every aggregate
 * response carries its `CapabilityGate` + `CoverageGrade[]` so the UI can
 * gate/annotate without a second request.
 */

// ---------------------------------------------------------------------------
// Identity, money, provenance
// ---------------------------------------------------------------------------

export const procurementMatchConfidenceSchema = z.enum([
  'high',
  'medium',
  'low',
])

export type ProcurementMatchConfidence = z.infer<
  typeof procurementMatchConfidenceSchema
>

export const partySchema = z.object({
  cui: z.string().nullable(),
  name: z.string().nullable(),
  displayName: z.string().nullable(),
  matchConfidence: procurementMatchConfidenceSchema.nullable(),
})

export type Party = z.infer<typeof partySchema>

export const moneyValueSchema = z.object({
  /** RON amount, or null when the row is non-RON or garbage-flagged. */
  ron: z.number().nullable(),
  /** Native amount as published (e.g. EUR/USD). */
  nativeValue: z.number().nullable(),
  /** ISO currency code, 'RON' when RON is the native currency. */
  currency: z.string().nullable(),
  /** Flagged garbage / out-of-band value (UX §6.3 ~74 canonical DA values). */
  isOutlier: z.boolean(),
})

export type MoneyValue = z.infer<typeof moneyValueSchema>

export const procurementProvenanceSchema = z.object({
  sourceSystem: z.enum([
    'elicitatie',
    'seap_notice',
    'seap',
    'elicitatie_da',
    'seap_da',
    'seap_dan',
    'ted',
  ]),
  sourceUrl: z.string().nullable(),
  retrievedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  isCanonical: z.boolean(),
  dupGroupId: z.string().nullable(),
})

export type ProcurementProvenance = z.infer<
  typeof procurementProvenanceSchema
>

export const procurementStatusSchema = z.enum([
  'published',
  'in_evaluation',
  'awarded',
  'cancelled',
  'suspended',
  'finalized',
  'offered',
  'unknown',
])

export type ProcurementStatus = z.infer<typeof procurementStatusSchema>

export const contractKindSchema = z.enum(['works', 'services', 'supplies'])

export type ContractKind = z.infer<typeof contractKindSchema>

// ---------------------------------------------------------------------------
// Grain records
// ---------------------------------------------------------------------------

export const procedureRecordSchema = z.object({
  id: z.string(),
  grain: z.literal('procedure'),
  noticeNo: z.string().nullable(),
  noticeKind: z.string().nullable(),
  procedureType: z.string().nullable(),
  contractKind: contractKindSchema.nullable(),
  title: z.string().nullable(),
  authority: partySchema,
  cpvCode: z.string().nullable(),
  cpvDivisionCode: z.string().nullable(),
  estimatedValue: moneyValueSchema,
  awardedValue: moneyValueSchema,
  status: procurementStatusSchema,
  countyName: z.string().nullable(),
  publicationDate: z.string().nullable(),
  stateDate: z.string().nullable(),
  provenance: procurementProvenanceSchema,
})

export type ProcedureRecord = z.infer<typeof procedureRecordSchema>

export const contractModificationSchema = z.object({
  id: z.string(),
  contractId: z.string().nullable(),
  linkMethod: z.string().nullable(),
  modificationDate: z.string().nullable(),
  valueBefore: moneyValueSchema,
  valueAfter: moneyValueSchema,
  valueDelta: moneyValueSchema,
  modificationType: z.string().nullable(),
})

export type ContractModification = z.infer<
  typeof contractModificationSchema
>

export const contractRecordSchema = z.object({
  id: z.string(),
  grain: z.literal('contract'),
  contractNo: z.string().nullable(),
  contractDate: z.string().nullable(),
  procedureId: z.string().nullable(),
  noticeNo: z.string().nullable(),
  title: z.string().nullable(),
  authority: partySchema,
  supplier: partySchema,
  cpvCode: z.string().nullable(),
  value: moneyValueSchema,
  estimatedValue: moneyValueSchema,
  status: procurementStatusSchema,
  provenance: procurementProvenanceSchema,
  modifications: z.array(contractModificationSchema),
})

export type ContractRecord = z.infer<typeof contractRecordSchema>

export const directAcquisitionRecordSchema = z.object({
  id: z.string(),
  grain: z.literal('direct_acquisition'),
  uniqueCode: z.string().nullable(),
  authority: partySchema,
  supplier: partySchema,
  cpvCode: z.string().nullable(),
  value: moneyValueSchema,
  estimatedValue: moneyValueSchema,
  status: procurementStatusSchema,
  stateId: z.string().nullable(),
  countyName: z.string().nullable(),
  publicationDate: z.string().nullable(),
  finalizationDate: z.string().nullable(),
  provenance: procurementProvenanceSchema,
})

export type DirectAcquisitionRecord = z.infer<
  typeof directAcquisitionRecordSchema
>

export const contractModificationRecordSchema = z.object({
  id: z.string(),
  grain: z.literal('modification'),
  contractId: z.string().nullable(),
  linkMethod: z.string().nullable(),
  modificationDate: z.string().nullable(),
  valueBefore: moneyValueSchema,
  valueAfter: moneyValueSchema,
  valueDelta: moneyValueSchema,
  modificationType: z.string().nullable(),
  // Carried so the modifications grain search row can link to the parent
  // contract detail with a section/hash (design review change #6).
  parentContract: z
    .object({
      contractNo: z.string().nullable(),
      authority: partySchema,
      supplier: partySchema,
    })
    .nullable(),
  provenance: procurementProvenanceSchema,
})

export type ContractModificationRecord = z.infer<
  typeof contractModificationRecordSchema
>

export const procurementGrainSchema = z.enum([
  'procedures',
  'contracts',
  'direct_acquisitions',
  'modifications',
])

export type ProcurementGrain = z.infer<typeof procurementGrainSchema>

export const procedureRecordSummarySchema = procedureRecordSchema

export type ProcedureRecordSummary = z.infer<
  typeof procedureRecordSummarySchema
>

export const contractRecordSummarySchema = contractRecordSchema.extend({
  modifications: z.array(contractModificationSchema).default([]),
})

export type ContractRecordSummary = z.infer<
  typeof contractRecordSummarySchema
>

export const directAcquisitionRecordSummarySchema =
  directAcquisitionRecordSchema

export type DirectAcquisitionRecordSummary = z.infer<
  typeof directAcquisitionRecordSummarySchema
>

export const procurementRecordSummarySchema = z.discriminatedUnion('grain', [
  procedureRecordSummarySchema,
  contractRecordSummarySchema,
  directAcquisitionRecordSummarySchema,
  contractModificationRecordSchema,
])

export type ProcurementRecordSummary = z.infer<
  typeof procurementRecordSummarySchema
>

// ---------------------------------------------------------------------------
// Aggregates / coverage / capability gate
// ---------------------------------------------------------------------------

export const coverageMetricSchema = z.enum([
  'authority_cui',
  'supplier_cui',
  'amount',
  'cpv',
  'flow_date',
  'authority_territory',
])

export type CoverageMetric = z.infer<typeof coverageMetricSchema>

export const coverageGradeSchema = z.object({
  metric: coverageMetricSchema,
  /** 0..1 presence rate. */
  rate: z.number(),
  /** Gate threshold for this metric. */
  threshold: z.number(),
  meetsThreshold: z.boolean(),
})

export type CoverageGrade = z.infer<typeof coverageGradeSchema>

export const allowedAnswerClassSchema = z.enum([
  'filter_count',
  'count_ranked_top_n',
  'spend_ranked_top_n',
  'buyer_region_filter',
  'cpv_category_filter',
  'same_day_direct_acquisition_signal',
])

export type AllowedAnswerClass = z.infer<typeof allowedAnswerClassSchema>

export const blockedDimensionSchema = z.enum([
  'supplier_region_filter',
  'llm_generated_filter',
])

export type BlockedDimension = z.infer<typeof blockedDimensionSchema>

export const capabilityGateSchema = z.object({
  grain: z.string(),
  allowed: z.array(allowedAnswerClassSchema),
  blocked: z.array(blockedDimensionSchema),
  coverage: z.array(coverageGradeSchema),
  /** Watermark ISO date; null when not served. */
  dataAsOf: z.string().nullable(),
  /** Human-readable cadence, e.g. 'zilnic (suspendat)'. */
  cadence: z.string().nullable(),
})

export type CapabilityGate = z.infer<typeof capabilityGateSchema>

export const topPartyRowSchema = z.object({
  party: partySchema,
  flowCount: z.number(),
  amount: moneyValueSchema,
  amountMissingCount: z.number(),
  /** Null when the total has missing amounts (no mixed-currency sum). */
  shareOfTotal: z.number().nullable(),
  evidenceRefs: z.array(z.string()),
})

export type TopPartyRow = z.infer<typeof topPartyRowSchema>

export const categoryRowSchema = z.object({
  divisionCode: z.string(),
  labelRo: z.string().nullable(),
  labelEn: z.string(),
  flowCount: z.number(),
  amount: moneyValueSchema,
})

export type CategoryRow = z.infer<typeof categoryRowSchema>

export const monthlyPointSchema = z.object({
  /** 'YYYY-MM'. */
  month: z.string(),
  amountPresent: z.number(),
  amountMissingCount: z.number(),
  flowCount: z.number(),
})

export type MonthlyPoint = z.infer<typeof monthlyPointSchema>

export const sameDayCandidateSchema = z.object({
  authority: partySchema,
  supplier: partySchema,
  cpvDivisionCode: z.string(),
  day: z.string(),
  sameDayCount: z.number(),
  sameDayTotal: moneyValueSchema,
  maxSingleAmount: moneyValueSchema,
  evidenceRefs: z.array(z.string()),
})

export type SameDayCandidate = z.infer<typeof sameDayCandidateSchema>

export const reviewSignalKindSchema = z.enum([
  'same_day',
  'repeated_pairs',
  'modification_inflation',
  'young_suppliers',
])

export type ReviewSignalKind = z.infer<typeof reviewSignalKindSchema>

// ---------------------------------------------------------------------------
// Aggregated page bundles
// ---------------------------------------------------------------------------

export const procurementLandingSchema = z.object({
  headline: z.object({
    totalVolume: moneyValueSchema,
    buyersCount: z.number(),
    suppliersCount: z.number(),
    recordsCount: z.number(),
  }),
  topAuthorities: z.array(topPartyRowSchema),
  topCategories: z.array(categoryRowSchema),
  gate: capabilityGateSchema,
})

export type ProcurementLanding = z.infer<typeof procurementLandingSchema>

export const procurementSearchPageSchema = z.object({
  grain: procurementGrainSchema,
  records: z.array(procurementRecordSummarySchema),
  page: z.object({
    page: z.number(),
    pageSize: z.number(),
    /** Null = unknown / too-large; UI shows '1000+'. */
    total: z.number().nullable(),
  }),
  gate: capabilityGateSchema,
})

export type ProcurementSearchPage = z.infer<
  typeof procurementSearchPageSchema
>

export const procurementRecordDetailSchema = <T extends z.ZodTypeAny>(
  recordSchema: T,
) =>
  z.object({
    record: recordSchema,
    related: z.object({
      procedure: procedureRecordSummarySchema.nullable(),
      contracts: z.array(contractRecordSummarySchema),
      modifications: z.array(contractModificationSchema),
      moneyFlowId: z.string().nullable(),
      duplicates: z.array(
        z.object({
          sourceSystem: z.string(),
          id: z.string(),
        }),
      ),
      perLotWinners: z
        .array(
          z.object({
            lotLabel: z.string(),
            winner: partySchema,
            awardedValue: moneyValueSchema,
          }),
        )
        .nullable(),
      ted: z
        .object({
          tedNoticeNo: z.string(),
          sourceUrl: z.string(),
        })
        .nullable(),
    }),
    gate: capabilityGateSchema,
  })

export type ProcurementRecordDetail<T> = {
  readonly record: T
  readonly related: {
    readonly procedure: ProcedureRecordSummary | null
    readonly contracts: readonly ContractRecordSummary[]
    readonly modifications: readonly ContractModification[]
    readonly moneyFlowId: string | null
    readonly duplicates: ReadonlyArray<{
      readonly sourceSystem: string
      readonly id: string
    }>
    readonly perLotWinners: ReadonlyArray<{
      readonly lotLabel: string
      readonly winner: Party
      readonly awardedValue: MoneyValue
    }> | null
    readonly ted: {
      readonly tedNoticeNo: string
      readonly sourceUrl: string
    } | null
  }
  readonly gate: CapabilityGate
}

export const cpvCategoryPageSchema = z.object({
  code: z.string(),
  level: z.enum(['division', 'code']),
  labelRo: z.string().nullable(),
  labelEn: z.string(),
  divisionCode: z.string(),
  parentCode: z.string().nullable(),
  summary: z.object({
    totalSpend: moneyValueSchema,
    recordCounts: z.object({
      contracts: z.number(),
      directAcquisitions: z.number(),
      procedures: z.number(),
    }),
  }),
  spendOverTime: z.array(monthlyPointSchema),
  topAuthorities: z.array(topPartyRowSchema),
  topSuppliers: z.array(topPartyRowSchema),
  relatedCategories: z.array(
    z.object({
      code: z.string(),
      labelRo: z.string().nullable(),
      labelEn: z.string(),
    }),
  ),
  gate: capabilityGateSchema,
})

export type CpvCategoryPage = z.infer<typeof cpvCategoryPageSchema>

export const supplierProcurementSliceSchema = z.object({
  supplierCui: z.string(),
  summary: z.object({
    window: z.object({ from: z.string(), to: z.string() }),
    totalPublicRevenue: moneyValueSchema,
    buyersCount: z.number(),
    contractsCount: z.number(),
    directAcquisitionsCount: z.number(),
    firstSeen: z.string().nullable(),
    lastSeen: z.string().nullable(),
  }),
  topBuyers: z.array(topPartyRowSchema),
  categoryBreakdown: z.array(categoryRowSchema),
  revenueOverTime: z.array(monthlyPointSchema),
  recentRecords: z.array(procurementRecordSummarySchema),
  crossDomain: z.object({
    pnrr: z.boolean(),
    publicInvestments: z.boolean(),
    litigation: z.boolean(),
    moneyFlows: z.boolean(),
  }),
  gate: capabilityGateSchema,
})

export type SupplierProcurementSlice = z.infer<
  typeof supplierProcurementSliceSchema
>

// ---------------------------------------------------------------------------
// Generic data-status / provenance (shared layer, defined here so adapters
// can attach the same shape without a UI-only import cycle).
// ---------------------------------------------------------------------------

export const dataStatusSchema = z.enum([
  'live',
  'mock',
  'partial',
  'stale',
  'blocked',
  'unverified',
])

export type DataStatus = z.infer<typeof dataStatusSchema>

export const provenanceInfoSchema = z.object({
  sourceLabel: z.string(),
  sourceUrl: z.string().nullable(),
  scraperRef: z.string().nullable(),
  retrievedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  parserNotes: z.array(z.string()),
})

export type ProvenanceInfo = z.infer<typeof provenanceInfoSchema>

export const identityConfidenceSchema = z.enum(['high', 'medium', 'low'])

export type IdentityConfidence = z.infer<typeof identityConfidenceSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mark the dataset status for a procurement bundle. The procurement facade
 * defaults to mock for `public-contracts-seap` until the live API is wired
 * (catalog entry `apiReady: false`), so every visible surface carries a
 * `DataStatusBadge(status="mock")` plus the gate's coverage data.
 */
export function procurementDataStatus(gate: CapabilityGate): DataStatus {
  // Mock-first: when the live adapter is not wired the facade returns mock
  // bundles and the page asserts mock via the adapter. The gate's coverage
  // still drives partial/stale downgrades inside the page.
  if (gate.dataAsOf === null) {
    return 'unverified'
  }
  const amountCoverage = gate.coverage.find((c) => c.metric === 'amount')
  if (amountCoverage && !amountCoverage.meetsThreshold) {
    return 'partial'
  }
  return 'live'
}
