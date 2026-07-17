import { z } from 'zod'

/**
 * Procurement domain UI-boundary schemas.
 *
 * Shapes mirror the procurement GraphQL contract the client is built against
 * (docs/design/procurement/graphql-api-spec.md; prod ground truth in
 * docs/procurement-prod-schema-reference.md). The live adapter
 * (features/procurement/api/procurement-api.live.ts) Zod-parses raw GraphQL
 * responses and maps them onto these types.
 *
 * Conventions:
 * - **Money is flat** on each record (no nested money object): `valueRon` /
 *   `estimatedValueRon` are RON **decimal strings** ('1171228.00') or null; the
 *   honesty flags are `isRon` + `valueSuspect`. There is no native value — prod
 *   does not expose it. Parse strings to numbers only at display time.
 * - Aggregate counts remain **bigint decimal strings** end-to-end. Unknown and
 *   abstained answers remain null; they are never converted to zero.
 * - Every analysis block carries the server's answerability envelope. Metadata
 *   applies only to the block it accompanies.
 */

// ---------------------------------------------------------------------------
// Identity, money, source vocabulary
// ---------------------------------------------------------------------------

/**
 * Reusable string-shape schemas mirroring the DTO's decimal/bigint string
 * fields, so malformed live data fails at the Zod boundary instead of becoming
 * NaN / 0 downstream. RON amounts allow a leading sign (modification deltas can
 * be negative); counts are non-negative integers; rates are 0..1.
 */
export const decimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'expected a decimal string')
export const bigintStringSchema = z
  .string()
  .regex(/^\d+$/, 'expected a non-negative integer string')

export const partySchema = z.object({
  cui: z.string().nullable(),
  name: z.string().nullable(),
  displayName: z.string().nullable(),
})

export type Party = z.infer<typeof partySchema>

/**
 * Flat money fields, merged into each record. Mirrors the server DTO:
 * `valueRon` is a RON decimal string (or null for non-RON / suspect-nulled),
 * `isRon` says whether a RON amount is available, `valueSuspect` flags an
 * outlier the loader could not trust.
 */
export const moneyFieldsSchema = z.object({
  valueRon: decimalStringSchema.nullable(),
  currency: z.string().nullable(),
  isRon: z.boolean(),
  valueSuspect: z.boolean(),
})

export type MoneyFields = z.infer<typeof moneyFieldsSchema>

/** Prod source-system vocabulary (per record). */
export const procurementSourceSystemSchema = z.enum([
  'seap_notice',
  'seap_contracts',
  'seap_da',
  'seap_dan',
  'elicitatie',
  'elicitatie_da',
  'elicitatie_ca_award',
])

export type ProcurementSourceSystem = z.infer<
  typeof procurementSourceSystemSchema
>

/** Grain used by the unified procurement analysis API. */
export const procurementAnalysisGrainSchema = z.enum([
  'procedure',
  'contract',
  'direct_acquisition',
])

export type ProcurementAnalysisGrain = z.infer<
  typeof procurementAnalysisGrainSchema
>

export const procurementStatusSchema = z.enum([
  'published',
  'in_evaluation',
  'awarded',
  'in_progress',
  'closed',
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
// Grain records (flat money + flat provenance)
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
  // Procedures carry estimated + awarded; `isRon`/`valueSuspect` qualify the awarded value.
  estimatedValueRon: decimalStringSchema.nullable(),
  awardedValueRon: decimalStringSchema.nullable(),
  currency: z.string().nullable(),
  isRon: z.boolean(),
  valueSuspect: z.boolean(),
  status: procurementStatusSchema,
  countyName: z.string().nullable(),
  publicationDate: z.string().nullable(),
  stateDate: z.string().nullable(),
  sourceSystem: procurementSourceSystemSchema,
  sourceUrl: z.string().nullable(),
  isCanonical: z.boolean(),
  dupGroupId: z.string().nullable(),
})

export type ProcedureRecord = z.infer<typeof procedureRecordSchema>

export const contractModificationSchema = z.object({
  id: z.string(),
  contractId: z.string().nullable(),
  linkMethod: z
    .enum(['notice_no', 'authority_cui+contract_no'])
    .nullable(),
  linkConfidence: z.number().nullable(),
  modificationDate: z.string().nullable(),
  // Modification values are RON-only decimal strings; delta may be negative.
  valueBeforeRon: decimalStringSchema.nullable(),
  valueAfterRon: decimalStringSchema.nullable(),
  valueDeltaRon: decimalStringSchema.nullable(),
  modificationType: z.string().nullable(),
})

export type ContractModification = z.infer<typeof contractModificationSchema>

export const contractRecordSchema = moneyFieldsSchema.extend({
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
  cpvDivisionCode: z.string().nullable(),
  estimatedValueRon: decimalStringSchema.nullable(),
  status: procurementStatusSchema,
  sourceSystem: procurementSourceSystemSchema,
  sourceUrl: z.string().nullable(),
  isCanonical: z.boolean(),
  dupGroupId: z.string().nullable(),
  modifications: z.array(contractModificationSchema),
})

export type ContractRecord = z.infer<typeof contractRecordSchema>

export const directAcquisitionRecordSchema = moneyFieldsSchema.extend({
  id: z.string(),
  grain: z.literal('direct_acquisition'),
  uniqueCode: z.string().nullable(),
  title: z.string().nullable(),
  authority: partySchema,
  supplier: partySchema,
  cpvCode: z.string().nullable(),
  cpvDivisionCode: z.string().nullable(),
  estimatedValueRon: decimalStringSchema.nullable(),
  status: procurementStatusSchema,
  stateId: z.string().nullable(),
  countyName: z.string().nullable(),
  publicationDate: z.string().nullable(),
  finalizationDate: z.string().nullable(),
  sourceSystem: procurementSourceSystemSchema,
  sourceUrl: z.string().nullable(),
  isCanonical: z.boolean(),
  dupGroupId: z.string().nullable(),
})

export type DirectAcquisitionRecord = z.infer<
  typeof directAcquisitionRecordSchema
>

export const contractModificationRecordSchema = z.object({
  id: z.string(),
  grain: z.literal('modification'),
  contractId: z.string().nullable(),
  linkMethod: z
    .enum(['notice_no', 'authority_cui+contract_no'])
    .nullable(),
  linkConfidence: z.number().nullable(),
  modificationDate: z.string().nullable(),
  valueBeforeRon: decimalStringSchema.nullable(),
  valueAfterRon: decimalStringSchema.nullable(),
  valueDeltaRon: decimalStringSchema.nullable(),
  modificationType: z.string().nullable(),
  authority: partySchema,
  supplier: partySchema,
  contractNo: z.string().nullable(),
  noticeNo: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  // Carried so the modifications grain search row can link to the parent
  // contract detail when the modification is linked.
  parentContract: z
    .object({
      contractNo: z.string().nullable(),
      authority: partySchema,
      supplier: partySchema,
    })
    .nullable(),
})

export type ContractModificationRecord = z.infer<
  typeof contractModificationRecordSchema
>

/** UI search-grain selector (which record type to list). */
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

export type ContractRecordSummary = z.infer<typeof contractRecordSummarySchema>

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
// Unified analysis answerability
// ---------------------------------------------------------------------------

export const procurementAnswerabilitySchema = z.enum([
  'served',
  'degraded',
  'abstained',
])

export const procurementAnswerReasonSchema = z.enum([
  'SPEND_COVERAGE_BELOW_GATE',
  'TIME_COVERAGE_BELOW_FLOOR',
  'GEO_COVERAGE_BELOW_FLOOR',
  'MISSING_QUALITY_VERDICT',
  'TIME_COVERAGE_DEGRADED',
  'GEO_COVERAGE_DEGRADED',
  'GENERATION_LACKS_CAPABILITY',
])

export const procurementAnswerMetaSchema = z.object({
  answerability: procurementAnswerabilitySchema,
  reason: procurementAnswerReasonSchema.nullable(),
  policyKey: z.string(),
  grain: procurementAnalysisGrainSchema,
  valueBasis: z.string().nullable(),
  dateBasis: z.string(),
  population: z.string(),
  buildId: z.string(),
  counts: z
    .object({ rows: bigintStringSchema, withValue: bigintStringSchema })
    .nullable(),
  undatedInScope: z
    .object({
      count: bigintStringSchema,
      valueRon: decimalStringSchema.nullable(),
    })
    .nullable(),
  provisional: z.boolean(),
  caveats: z.array(z.string()),
  canonicalScope: z.string(),
})

export type ProcurementAnswerMeta = z.infer<
  typeof procurementAnswerMetaSchema
>

// ---------------------------------------------------------------------------
// Aggregate rollup rows (counts are bigint decimal strings)
// ---------------------------------------------------------------------------

/** A ranked org-edge row (top authorities / top suppliers). */
export const topPartyRowSchema = z.object({
  authority: partySchema.nullable(),
  supplier: partySchema.nullable(),
  grain: procurementAnalysisGrainSchema,
  bucketKind: z.enum(['top', 'other', 'unknown']),
  flowCount: bigintStringSchema,
  amountRonSum: decimalStringSchema.nullable(),
  amountPresentCount: bigintStringSchema,
  amountMissingCount: bigintStringSchema,
  firstFlowDate: z.string().nullable(),
  lastFlowDate: z.string().nullable(),
  evidenceRefsSample: z.array(z.string()),
  shareOfScope: decimalStringSchema.nullable(),
})

export type TopPartyRow = z.infer<typeof topPartyRowSchema>

/** A CPV-division breakdown row. */
export const categoryRowSchema = z.object({
  cpvDivisionCode: z.string().nullable(),
  cpvDivisionLabelEn: z.string().nullable(),
  cpvDivisionLabelRo: z.string().nullable(),
  grain: procurementAnalysisGrainSchema,
  bucketKind: z.enum(['top', 'other', 'unknown']),
  flowCount: bigintStringSchema,
  amountRonSum: decimalStringSchema.nullable(),
  amountPresentCount: bigintStringSchema,
  amountMissingCount: bigintStringSchema,
  shareOfScope: decimalStringSchema.nullable(),
})

export type CategoryRow = z.infer<typeof categoryRowSchema>

export const monthlyPointSchema = z.object({
  /** 'YYYY-MM'. */
  month: z.string(),
  flowCount: bigintStringSchema,
  amountRonSum: decimalStringSchema.nullable(),
  amountPresentCount: bigintStringSchema.nullable(),
  amountMissingCount: bigintStringSchema.nullable(),
})

export type MonthlyPoint = z.infer<typeof monthlyPointSchema>

export const procurementStatsBlockSchema = z.object({
  grain: procurementAnalysisGrainSchema,
  recordCount: bigintStringSchema.nullable(),
  withValueCount: bigintStringSchema.nullable(),
  withEstimatedCount: bigintStringSchema.nullable(),
  valueAwardedSum: decimalStringSchema.nullable(),
  valueEstimatedSum: decimalStringSchema.nullable(),
  avgValueAwarded: decimalStringSchema.nullable(),
  minMonth: z.string().nullable(),
  maxMonth: z.string().nullable(),
  meta: procurementAnswerMetaSchema,
})

export type ProcurementStatsBlock = z.infer<
  typeof procurementStatsBlockSchema
>

const procurementGrainAnalyticsSchema = z.object({
  grain: procurementAnalysisGrainSchema,
  stats: procurementStatsBlockSchema,
  topAuthorities: z.array(topPartyRowSchema),
  topSuppliers: z.array(topPartyRowSchema),
  topCategories: z.array(categoryRowSchema),
  monthly: z.array(monthlyPointSchema),
  meta: z.object({
    authorities: procurementAnswerMetaSchema.nullable(),
    suppliers: procurementAnswerMetaSchema.nullable(),
    categories: procurementAnswerMetaSchema.nullable(),
    recordSeries: procurementAnswerMetaSchema,
    valueSeries: procurementAnswerMetaSchema,
  }),
})

export type ProcurementGrainAnalytics = z.infer<
  typeof procurementGrainAnalyticsSchema
>

const procurementAnalysisByGrainSchema = z.object({
  procedure: procurementGrainAnalyticsSchema,
  contract: procurementGrainAnalyticsSchema,
  directAcquisition: procurementGrainAnalyticsSchema,
})

const procurementFlowAnalysisByGrainSchema = z.object({
  contract: procurementGrainAnalyticsSchema,
  directAcquisition: procurementGrainAnalyticsSchema,
})

export const sameDayCandidateSchema = z.object({
  candidateDate: z.string(),
  authority: partySchema,
  supplier: partySchema,
  cpvCode: z.string().nullable(),
  cpvDivisionCode: z.string().nullable(),
  sameDayCount: bigintStringSchema,
  sameDayTotalRon: decimalStringSchema.nullable(),
  maxSingleAmountRon: decimalStringSchema.nullable(),
  amountPresentCount: bigintStringSchema,
  amountMissingCount: bigintStringSchema,
  evidenceRefsSample: z.array(z.string()),
})

export type SameDayCandidate = z.infer<typeof sameDayCandidateSchema>

/** Review-signal kinds backed by prod projections (others are UI-derived only). */
export const reviewSignalKindSchema = z.enum(['same_day', 'repeated_pairs'])

export type ReviewSignalKind = z.infer<typeof reviewSignalKindSchema>

// ---------------------------------------------------------------------------
// Aggregated page bundles
// ---------------------------------------------------------------------------

export const procurementLandingSchema = z.object({
  headline: z.object({
    /** RON sum decimal string, or null when not summable. */
    totalValueRon: decimalStringSchema.nullable(),
    // Counts are nullable so an unknown count stays representable ("—"),
    // never fabricated as 0.
    proceduresCount: bigintStringSchema.nullable(),
    directAcquisitionsCount: bigintStringSchema.nullable(),
    contractsCount: bigintStringSchema.nullable(),
    buyersCount: bigintStringSchema.nullable(),
    suppliersCount: bigintStringSchema.nullable(),
    recordsCount: bigintStringSchema.nullable(),
  }),
  analysisByGrain: procurementAnalysisByGrainSchema,
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
})

export type ProcurementSearchPage = z.infer<typeof procurementSearchPageSchema>

export const procurementRecordDetailSchema = <T extends z.ZodTypeAny>(
  recordSchema: T,
) =>
  z.object({
    record: recordSchema,
    related: z.object({
      procedure: procedureRecordSummarySchema.nullable(),
      contracts: z.array(contractRecordSummarySchema),
      modifications: z.array(contractModificationSchema),
      duplicates: z.array(
        z.object({
          sourceSystem: procurementSourceSystemSchema,
          id: z.string(),
        }),
      ),
      perLotWinners: z
        .array(
          z.object({
            lotLabel: z.string(),
            winner: partySchema,
            valueRon: decimalStringSchema.nullable(),
            currency: z.string().nullable(),
            isRon: z.boolean(),
            valueSuspect: z.boolean(),
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
  })

export type ProcurementRecordDetail<T> = {
  readonly record: T
  readonly related: {
    readonly procedure: ProcedureRecordSummary | null
    readonly contracts: readonly ContractRecordSummary[]
    readonly modifications: readonly ContractModification[]
    readonly duplicates: ReadonlyArray<{
      readonly sourceSystem: ProcurementSourceSystem
      readonly id: string
    }>
    readonly perLotWinners: ReadonlyArray<{
      readonly lotLabel: string
      readonly winner: Party
      readonly valueRon: string | null
      readonly currency: string | null
      readonly isRon: boolean
      readonly valueSuspect: boolean
    }> | null
    readonly ted: {
      readonly tedNoticeNo: string
      readonly sourceUrl: string
    } | null
  }
}

export const cpvCategoryPageSchema = z.object({
  code: z.string(),
  level: z.enum(['division', 'code']),
  labelRo: z.string().nullable(),
  labelEn: z.string(),
  divisionCode: z.string(),
  parentCode: z.string().nullable(),
  summary: z.object({
    /** RON sum decimal string, or null when not summable. */
    totalValueRon: decimalStringSchema.nullable(),
    recordCounts: z.object({
      contracts: bigintStringSchema.nullable(),
      directAcquisitions: bigintStringSchema.nullable(),
      procedures: bigintStringSchema.nullable(),
    }),
  }),
  analysisByGrain: procurementAnalysisByGrainSchema,
  relatedCategories: z.array(
    z.object({
      code: z.string(),
      labelRo: z.string().nullable(),
      labelEn: z.string(),
    }),
  ),
})

export type CpvCategoryPage = z.infer<typeof cpvCategoryPageSchema>

export const supplierProcurementSliceSchema = z.object({
  supplierCui: z.string(),
  summary: z.object({
    window: z.object({
      from: z.string().nullable(),
      to: z.string().nullable(),
    }),
    /** RON sum decimal string, or null when not summable. */
    totalPublicRevenueRon: decimalStringSchema.nullable(),
    buyersCount: bigintStringSchema.nullable(),
    contractsCount: bigintStringSchema.nullable(),
    directAcquisitionsCount: bigintStringSchema.nullable(),
    firstSeen: z.string().nullable(),
    lastSeen: z.string().nullable(),
  }),
  analysisByGrain: procurementFlowAnalysisByGrainSchema,
  recentRecords: z.array(procurementRecordSummarySchema),
  /**
   * Presence flags for other transparency domains. The procurement API has no
   * backing for these — live serves `null` ("unknown", chips hidden) rather
   * than fabricated booleans; mocks may populate them.
   */
  crossDomain: z
    .object({
      pnrr: z.boolean(),
      publicInvestments: z.boolean(),
      litigation: z.boolean(),
      moneyFlows: z.boolean(),
    })
    .nullable(),
})

export type SupplierProcurementSlice = z.infer<
  typeof supplierProcurementSliceSchema
>

/**
 * One cursor page of a supplier's canonical flow records (contracts + direct
 * acquisitions, date desc) — backs the "load more" list embedded in company
 * profiles.
 */
export const supplierRecordsPageSchema = z.object({
  records: z.array(procurementRecordSummarySchema),
  /** Null = unknown / too-large; UI shows '1000+'. */
  total: z.number().nullable(),
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable(),
})

export type SupplierRecordsPage = z.infer<typeof supplierRecordsPageSchema>

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
 * Derive a dataset status from one server answer envelope. Metadata never
 * applies beyond the analysis block that supplied it.
 */
export function procurementDataStatus(meta: ProcurementAnswerMeta): DataStatus {
  switch (meta.answerability) {
    case 'served':
      return 'live'
    case 'degraded':
      return 'partial'
    case 'abstained':
      return 'unverified'
  }
}
