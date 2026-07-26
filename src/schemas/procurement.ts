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
 * - **Money is flat** on each record: `valueRon` / `estimatedValueRon` /
 *   `awardedValueRon` are the row's OWN parsed RON **decimal strings**
 *   ('1171228.00') or null, and a `value` block carries the data-layer
 *   resolution (rules v2). Display keys on `value.valueRonComparable` +
 *   `value.valueState`, never the raw own value. Parse strings to numbers only
 *   at display time.
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
 * The data-layer value resolution (rules v2), mirroring the server
 * `ProcurementValueResolution`. `valueRonComparable` is the ONLY
 * cross-row-comparable money; `valueState` explains its presence/absence and
 * `valueAccepted` is true iff the state is accepted (the money is servable).
 * `valueComparableBasis` is 'official' (a source RON amount) or 'derived_bnr'
 * (a BNR-converted foreign amount).
 */
export const valueResolutionSchema = z.object({
  valueState: z.string().nullable(),
  valueStateRule: z.string().nullable(),
  valueAccepted: z.boolean(),
  valueRonComparable: decimalStringSchema.nullable(),
  valueComparableBasis: z.string().nullable(),
  valueRulesVersion: z.number().nullable(),
  valueResolvedAt: z.string().nullable(),
})

export type ValueResolution = z.infer<typeof valueResolutionSchema>

/**
 * Flat money slice for display. `valueRon` is the row's OWN parsed RON evidence
 * (a decimal string, or null); `value` is the data-layer resolution — null for
 * unresolved slices (an estimated value, a modification delta, a lot winner).
 * Display keys on `value.valueRonComparable` + `value.valueState`, NEVER the raw
 * own `valueRon` (which is a garbage number for `invalid_source_value` rows).
 */
export const moneyFieldsSchema = z.object({
  valueRon: decimalStringSchema.nullable(),
  currency: z.string().nullable(),
  value: valueResolutionSchema.nullable(),
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

/**
 * Grain used by the unified procurement analysis API. framework / calloff /
 * modification (value-basis wave) are EXPLICIT-ONLY populations — they answer
 * only when named; implicit requests fan out over the three core grains.
 */
export const procurementAnalysisGrainSchema = z.enum([
  'procedure',
  'contract',
  'direct_acquisition',
  'framework',
  'calloff',
  'modification',
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
  // Procedures carry estimated + awarded; `value` resolves the awarded value.
  estimatedValueRon: decimalStringSchema.nullable(),
  awardedValueRon: decimalStringSchema.nullable(),
  currency: z.string().nullable(),
  value: valueResolutionSchema,
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

export const contractDisplayTitleSourceSchema = z.enum([
  'native',
  'matched_award',
  'procedure',
])

export type ContractDisplayTitleSource = z.infer<
  typeof contractDisplayTitleSourceSchema
>

export const contractDisplayTitleSchema = z.object({
  text: z.string(),
  source: contractDisplayTitleSourceSchema,
  sourceUrl: z.string().nullable(),
})

export type ContractDisplayTitle = z.infer<typeof contractDisplayTitleSchema>

export const contractRecordSchema = moneyFieldsSchema.extend({
  id: z.string(),
  grain: z.literal('contract'),
  contractNo: z.string().nullable(),
  contractDate: z.string().nullable(),
  procedureId: z.string().nullable(),
  noticeNo: z.string().nullable(),
  // `title` remains source-owned. The display fields are additive evidence
  // selected by the server and must never be used for identity or dedup.
  title: z.string().nullable(),
  displayTitle: contractDisplayTitleSchema.nullable(),
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
  // Contract-only value provenance: which evidence family won ('seap_own' |
  // 'elicitatie_ca_award' | 'dup_group'), and whether own/cross evidence
  // disagreed (state 'conflicting_sources').
  canonicalValueSource: z.string().nullable(),
  valueDisagreement: z.boolean(),
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
  'SPEND_SERVED_DISCLOSED',
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

/**
 * Per-measure money answerability: one stats block can carry different
 * verdicts per money basis (awarded disclosed + estimated abstained). Display
 * of a NON-anchor money figure must key on ITS verdict, not the block meta.
 */
export const procurementMoneyVerdictSchema = z.object({
  measure: z.string(),
  answerability: procurementAnswerabilitySchema,
  reason: procurementAnswerReasonSchema.nullable(),
  caveats: z.array(z.string()),
})

export type ProcurementMoneyVerdict = z.infer<
  typeof procurementMoneyVerdictSchema
>

export const procurementStatsBlockSchema = z.object({
  grain: procurementAnalysisGrainSchema,
  recordCount: bigintStringSchema.nullable(),
  withValueCount: bigintStringSchema.nullable(),
  withEstimatedCount: bigintStringSchema.nullable(),
  valueAwardedSum: decimalStringSchema.nullable(),
  valueEstimatedSum: decimalStringSchema.nullable(),
  /** Framework grain only: Σ attributed ceiling (maximum committed, NOT spend). */
  valueCeilingSum: decimalStringSchema.nullable(),
  /** Contract grain only: Σ modification-adjusted value (verified chains). */
  valueModAdjustedSum: decimalStringSchema.nullable(),
  /**
   * Contract grain only: Σ awarded value over the SAME population as
   * `valueModAdjustedSum`. The pair is the only valid amendment delta —
   * `valueModAdjustedSum - valueAwardedSum` compares different populations
   * and reads as a spurious multi-billion "saving".
   */
  valueAwardedMatchedSum: decimalStringSchema.nullable(),
  avgValueAwarded: decimalStringSchema.nullable(),
  minMonth: z.string().nullable(),
  maxMonth: z.string().nullable(),
  moneyVerdicts: z.array(procurementMoneyVerdictSchema),
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
    authoritiesRankedBy: z.enum(['count', 'value']).nullable(),
    suppliersRankedBy: z.enum(['count', 'value']).nullable(),
    categoriesRankedBy: z.enum(['count', 'value']).nullable(),
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

/**
 * Which surface answered the record list and how fresh it is. The search
 * engine serves membership, order and counts as of an index build; Postgres
 * hydrates the row values either way, so the figures shown are always the
 * production database's.
 */
export const procurementSearchProvenanceSchema = z.object({
  engine: z.enum(['opensearch', 'postgres']),
  /** Index build timestamp (ISO-8601); null on the live Postgres path. */
  asOf: z.string().nullable(),
})

export type ProcurementSearchProvenance = z.infer<
  typeof procurementSearchProvenanceSchema
>

/**
 * How the CURRENT result set distributes over one dimension. Result-set
 * counts — never authoritative analytics (those come from the analysis
 * surface, over the whole scope).
 */
export const procurementSearchFacetSchema = z.object({
  dimension: z.string(),
  buckets: z.array(z.object({ key: z.string(), count: z.number() })),
  /** Records outside the returned buckets — disclosed, never dropped. */
  otherCount: z.number(),
})

export type ProcurementSearchFacet = z.infer<typeof procurementSearchFacetSchema>

/**
 * Where the text query matched in one record. The strings are the ORIGINAL text
 * with the matched terms wrapped in U+27E6 … U+27E7 — sentinels rather than
 * markup, so the renderer splits on them and emits its own element (a title
 * containing `<mark>` can never become markup).
 *
 * Presentational only: fragments come from the search index (as of
 * `provenance.asOf`), while every rendered value comes from the database.
 */
export const procurementSearchHighlightSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  authorityName: z.string().nullable().optional(),
  supplierName: z.string().nullable().optional(),
})

export type ProcurementSearchHighlight = z.infer<
  typeof procurementSearchHighlightSchema
>

export const procurementSearchPageSchema = z.object({
  grain: procurementGrainSchema,
  records: z.array(procurementRecordSummarySchema),
  page: z.object({
    page: z.number(),
    pageSize: z.number(),
    /** Null = unknown / too-large; UI shows '1000+'. */
    total: z.number().nullable(),
  }),
  /** Absent on an older server that does not report it. */
  provenance: procurementSearchProvenanceSchema.nullable().optional(),
  facets: z.array(procurementSearchFacetSchema).optional(),
  /** Present only for an engine-served `q` page. Keyed by record id. */
  highlights: z.array(procurementSearchHighlightSchema).optional(),
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

/**
 * Why a direct acquisition has no detail body. Absence of a detail is NOT
 * absence of a purchase — the detail surface covers ~41% of direct acquisitions
 * by design, and the three "missing" cases mean very different things:
 * NOT_AVAILABLE_FOR_SOURCE is permanent (that family has no detail feed at
 * all), NOT_CAPTURED is a gap a running backfill is still closing, and
 * TEMPORARILY_UNAVAILABLE is this request failing to read the detail projection
 * — it says nothing about the source, and the summary shown above stays valid.
 */
export type DaDetailAvailability =
  | 'AVAILABLE'
  | 'NOT_AVAILABLE_FOR_SOURCE'
  | 'NOT_CAPTURED'
  | 'TEMPORARILY_UNAVAILABLE'

/** One catalog line item of a direct acquisition. */
export type DaItem = {
  readonly id: string
  readonly itemIndex: number
  readonly catalogItemCode: string | null
  readonly catalogItemName: string | null
  readonly catalogItemDescription: string | null
  readonly itemMeasureUnit: string | null
  readonly cpvCode: string | null
  readonly cpvText: string | null
  /** Decimal strings — keep them as strings; formatting must not lose precision. */
  readonly itemQuantity: string | null
  readonly unitPrice: string | null
  readonly unitEstimatedPrice: string | null
  readonly catalogUnitPrice: string | null
  readonly lineValue: string | null
  readonly sourceUrl: string
}

export type DaDetail = {
  readonly description: string | null
  readonly deliveryCondition: string | null
  readonly paymentCondition: string | null
  readonly contractTypeText: string | null
  readonly isEuFunded: boolean
  readonly euFundText: string | null
  readonly caDecisionDate: string | null
  readonly caDecisionDeadline: string | null
  readonly supplierDecisionDate: string | null
  readonly supplierDecisionDeadline: string | null
  readonly caRejectionReason: string | null
  readonly supplierRejectionReason: string | null
  readonly correctionReason: string | null
  readonly documentCount: number
  readonly itemCount: number
  readonly itemsTotal: string | null
  readonly itemsValueDelta: string | null
  /** false = the source's own numbers disagree; null = nothing to reconcile against. */
  readonly itemsReconciled: boolean | null
  /** true = free text withheld from this caller (contact data), not absent. */
  readonly textRedacted: boolean
  readonly sourceUrl: string
  readonly items: readonly DaItem[]
}

export type ProcurementRecordDetail<T> = {
  readonly record: T
  readonly daDetail?: DaDetail | null
  readonly daDetailAvailability?: DaDetailAvailability
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
  /** Resolved display name when the identity spine has a canonical one. */
  supplierName: z.string().nullable().default(null),
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
 * Institution profile spine: every population this buyer appears in, plus the
 * four signals. One population = one server grain; money is ALWAYS the
 * population's own anchor measure (awarded / ceiling / call-off value), never
 * a figure borrowed from another population, and never summed across them.
 */
export const procurementInstitutionPopulationSchema = z.object({
  grain: procurementAnalysisGrainSchema,
  recordCount: bigintStringSchema.nullable(),
  /** The population's anchor money measure, or null on counts-only grains. */
  anchorMeasure: z.string().nullable(),
  /** Anchor money value — null when the population's gate withholds it. */
  anchorValueRon: decimalStringSchema.nullable(),
  stats: procurementStatsBlockSchema,
})
export type ProcurementInstitutionPopulation = z.infer<
  typeof procurementInstitutionPopulationSchema
>

export const procurementInstitutionSignalsSchema = z.object({
  /** Supplier concentration for this buyer; `totalRon` covers only KNOWN suppliers. */
  concentration: z
    .object({
      supplierCount: z.number().nullable(),
      top1Share: decimalStringSchema.nullable(),
      top5Share: decimalStringSchema.nullable(),
      hhi: decimalStringSchema.nullable(),
      totalRon: decimalStringSchema.nullable(),
      /**
       * Awarded money in scope that belongs to multi-member consortium awards
       * and therefore to no single supplier — the published data carries no
       * split between the members. This is what the ranking does NOT cover,
       * alongside the unknown-supplier weight; it is NOT "supplier
       * unidentified", and the UI must not describe it that way.
       */
      withheldConsortiumRon: decimalStringSchema.nullable(),
      meta: procurementAnswerMetaSchema,
    })
    .nullable(),
  /**
   * How competitively the money was awarded — an IN-GRAIN procedure-type
   * breakdown. A "direct acquisition share" would be a cross-grain ratio,
   * which the serving contract forbids.
   */
  procedureMix: z.array(
    z.object({
      key: z.string().nullable(),
      kind: z.string(),
      recordCount: bigintStringSchema.nullable(),
      valueRon: decimalStringSchema.nullable(),
    }),
  ),
  /**
   * Net amendment effect = adjusted − matched baseline, over the contracts
   * whose amendment chains resolve. Never derived from the grain-wide awarded
   * sum (different population).
   */
  amendment: z
    .object({
      matchedRon: decimalStringSchema,
      adjustedRon: decimalStringSchema,
      deltaRon: decimalStringSchema,
      answerability: procurementAnswerabilitySchema,
    })
    .nullable(),
  /** Committed framework ceilings vs the call-offs actually reported under them. */
  frameworkExposure: z
    .object({
      frameworkCount: bigintStringSchema.nullable(),
      ceilingRon: decimalStringSchema.nullable(),
      calloffCount: bigintStringSchema.nullable(),
      calloffRon: decimalStringSchema.nullable(),
    })
    .nullable(),
})
export type ProcurementInstitutionSignals = z.infer<
  typeof procurementInstitutionSignalsSchema
>

export const procurementInstitutionOverviewSchema = z.object({
  authorityCui: z.string(),
  authorityName: z.string().nullable(),
  populations: z.array(procurementInstitutionPopulationSchema),
  signals: procurementInstitutionSignalsSchema,
})
export type ProcurementInstitutionOverview = z.infer<
  typeof procurementInstitutionOverviewSchema
>

/**
 * Buyer-side procurement slice — dedicated institution page and the entity
 * `contracts` / achiziții view. Mirrors the supplier slice on the authority
 * axis (top suppliers instead of top buyers).
 */
export const authorityProcurementSliceSchema = z.object({
  authorityCui: z.string(),
  /** Resolved display name when the party-name lookup finds one. */
  authorityName: z.string().nullable(),
  summary: z.object({
    window: z.object({
      from: z.string().nullable(),
      to: z.string().nullable(),
    }),
    /** RON sum decimal string, or null when not summable. */
    totalSpendRon: decimalStringSchema.nullable(),
    suppliersCount: bigintStringSchema.nullable(),
    contractsCount: bigintStringSchema.nullable(),
    directAcquisitionsCount: bigintStringSchema.nullable(),
    proceduresCount: bigintStringSchema.nullable(),
    firstSeen: z.string().nullable(),
    lastSeen: z.string().nullable(),
  }),
  analysisByGrain: procurementFlowAnalysisByGrainSchema,
  recentRecords: z.array(procurementRecordSummarySchema),
})

export type AuthorityProcurementSlice = z.infer<
  typeof authorityProcurementSliceSchema
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
