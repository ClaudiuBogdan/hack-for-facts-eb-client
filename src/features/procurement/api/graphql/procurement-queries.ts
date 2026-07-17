/**
 * GraphQL query documents + raw-response Zod schemas for the procurement
 * surface. The raw shapes mirror the server SDL specified in
 * docs/design/procurement/graphql-api-spec.md; the mappers in
 * `procurement-mappers.ts` translate them into the UI's Zod types
 * (`@/schemas/procurement`).
 *
 * Raw schemas are deliberately all-nullable (except identifiers) so a sparse
 * server row fails at the mapper's honesty rules, not at the transport parse.
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared raw fragments
// ---------------------------------------------------------------------------

export const rawPartySchema = z.object({
  cui: z.string().nullable(),
  name: z.string().nullable(),
  displayName: z.string().nullable(),
})
export type RawProcurementParty = z.infer<typeof rawPartySchema>

/** GraphQL selection for a party block (reused across queries). */
const PARTY_FIELDS = /* GraphQL */ `cui name displayName`

/** GraphQL selection for the flat money block on flow records. */
const MONEY_FIELDS = /* GraphQL */ `valueRon estimatedValueRon currency isRon valueSuspect`

const rawMoneyFields = {
  valueRon: z.string().nullable(),
  estimatedValueRon: z.string().nullable(),
  currency: z.string().nullable(),
  isRon: z.boolean(),
  valueSuspect: z.boolean(),
}

export const rawProcedureSchema = z.object({
  id: z.string(),
  noticeNo: z.string().nullable(),
  noticeKind: z.string().nullable(),
  procedureType: z.string().nullable(),
  contractKind: z.string().nullable(),
  title: z.string().nullable(),
  authority: rawPartySchema,
  cpvCode: z.string().nullable(),
  cpvDivisionCode: z.string().nullable(),
  estimatedValueRon: z.string().nullable(),
  awardedValueRon: z.string().nullable(),
  currency: z.string().nullable(),
  isRon: z.boolean(),
  valueSuspect: z.boolean(),
  status: z.string(),
  countyName: z.string().nullable(),
  publicationDate: z.string().nullable(),
  stateDate: z.string().nullable(),
  sourceSystem: z.string(),
  sourceUrl: z.string().nullable(),
  isCanonical: z.boolean(),
  dupGroupId: z.string().nullable(),
})
export type RawProcurementProcedure = z.infer<typeof rawProcedureSchema>

const PROCEDURE_FIELDS = /* GraphQL */ `
  id noticeNo noticeKind procedureType contractKind title
  authority { ${PARTY_FIELDS} }
  cpvCode cpvDivisionCode
  estimatedValueRon awardedValueRon currency isRon valueSuspect
  status countyName publicationDate stateDate
  sourceSystem sourceUrl isCanonical dupGroupId
`

export const rawModificationTrailEntrySchema = z.object({
  id: z.string(),
  contractId: z.string().nullable(),
  linkMethod: z.string().nullable(),
  linkConfidence: z.number().nullable(),
  modificationDate: z.string().nullable(),
  valueBeforeRon: z.string().nullable(),
  valueAfterRon: z.string().nullable(),
  valueDeltaRon: z.string().nullable(),
  modificationType: z.string().nullable(),
})
export type RawProcurementModificationTrailEntry = z.infer<
  typeof rawModificationTrailEntrySchema
>

const MODIFICATION_TRAIL_FIELDS = /* GraphQL */ `
  id contractId linkMethod linkConfidence modificationDate
  valueBeforeRon valueAfterRon valueDeltaRon modificationType
`

export const rawContractSchema = z.object({
  id: z.string(),
  contractNo: z.string().nullable(),
  contractDate: z.string().nullable(),
  procedureId: z.string().nullable(),
  noticeNo: z.string().nullable(),
  title: z.string().nullable(),
  authority: rawPartySchema,
  supplier: rawPartySchema,
  cpvCode: z.string().nullable(),
  cpvDivisionCode: z.string().nullable(),
  ...rawMoneyFields,
  status: z.string(),
  sourceSystem: z.string(),
  sourceUrl: z.string().nullable(),
  isCanonical: z.boolean(),
  dupGroupId: z.string().nullable(),
  modifications: z.array(rawModificationTrailEntrySchema).nullable(),
})
export type RawProcurementContract = z.infer<typeof rawContractSchema>

const CONTRACT_CORE_FIELDS = /* GraphQL */ `
  id contractNo contractDate procedureId noticeNo title
  authority { ${PARTY_FIELDS} }
  supplier { ${PARTY_FIELDS} }
  cpvCode cpvDivisionCode
  ${MONEY_FIELDS}
  status sourceSystem sourceUrl isCanonical dupGroupId
`

const CONTRACT_FIELDS = /* GraphQL */ `
  ${CONTRACT_CORE_FIELDS}
  modifications { ${MODIFICATION_TRAIL_FIELDS} }
`

export const rawDirectAcquisitionSchema = z.object({
  id: z.string(),
  uniqueCode: z.string().nullable(),
  title: z.string().nullable(),
  authority: rawPartySchema,
  supplier: rawPartySchema,
  cpvCode: z.string().nullable(),
  cpvDivisionCode: z.string().nullable(),
  ...rawMoneyFields,
  status: z.string(),
  countyName: z.string().nullable(),
  publicationDate: z.string().nullable(),
  finalizationDate: z.string().nullable(),
  sourceSystem: z.string(),
  sourceUrl: z.string().nullable(),
  isCanonical: z.boolean(),
  dupGroupId: z.string().nullable(),
})
export type RawProcurementDirectAcquisition = z.infer<
  typeof rawDirectAcquisitionSchema
>

const DIRECT_ACQUISITION_FIELDS = /* GraphQL */ `
  id uniqueCode title
  authority { ${PARTY_FIELDS} }
  supplier { ${PARTY_FIELDS} }
  cpvCode cpvDivisionCode
  ${MONEY_FIELDS}
  status countyName publicationDate finalizationDate
  sourceSystem sourceUrl isCanonical dupGroupId
`

export const rawModificationSchema = rawModificationTrailEntrySchema.extend({
  authority: rawPartySchema,
  supplier: rawPartySchema,
  contractNo: z.string().nullable(),
  noticeNo: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  parentContract: z
    .object({
      contractNo: z.string().nullable(),
      authority: rawPartySchema,
      supplier: rawPartySchema,
    })
    .nullable(),
})
export type RawProcurementModification = z.infer<typeof rawModificationSchema>

const MODIFICATION_FIELDS = /* GraphQL */ `
  ${MODIFICATION_TRAIL_FIELDS}
  authority { ${PARTY_FIELDS} }
  supplier { ${PARTY_FIELDS} }
  contractNo noticeNo sourceUrl
  parentContract {
    contractNo
    authority { ${PARTY_FIELDS} }
    supplier { ${PARTY_FIELDS} }
  }
`

export const rawAnswerMetaSchema = z.object({
  answerability: z.string().nullable(),
  reason: z.string().nullable(),
  policyKey: z.string().nullable(),
  grain: z.string(),
  valueBasis: z.string().nullable(),
  dateBasis: z.string().nullable(),
  population: z.string().nullable(),
  buildId: z.string().nullable(),
  counts: z
    .object({ rows: z.string().nullable(), withValue: z.string().nullable() })
    .nullable(),
  undatedInScope: z
    .object({ count: z.string().nullable(), valueRon: z.string().nullable() })
    .nullable(),
  provisional: z.boolean().nullable(),
  caveats: z.array(z.string()).nullable(),
  canonicalScope: z.string().nullable(),
})
export type RawProcurementAnswerMeta = z.infer<typeof rawAnswerMetaSchema>

const ANSWER_META_FIELDS = /* GraphQL */ `
  answerability reason policyKey grain valueBasis dateBasis population buildId
  counts { rows withValue }
  undatedInScope { count valueRon }
  provisional caveats canonicalScope
`

export const rawStatsBlockSchema = z.object({
  grain: z.string(),
  recordCount: z.string().nullable(),
  withValueCount: z.string().nullable(),
  withEstimatedCount: z.string().nullable(),
  valueAwardedSum: z.string().nullable(),
  valueEstimatedSum: z.string().nullable(),
  avgValueAwarded: z.string().nullable(),
  minMonth: z.string().nullable(),
  maxMonth: z.string().nullable(),
  meta: rawAnswerMetaSchema,
})
export type RawProcurementStatsBlock = z.infer<typeof rawStatsBlockSchema>

const STATS_BLOCK_FIELDS = /* GraphQL */ `
  grain recordCount withValueCount withEstimatedCount
  valueAwardedSum valueEstimatedSum avgValueAwarded minMonth maxMonth
  meta { ${ANSWER_META_FIELDS} }
`

export const rawBreakdownBucketSchema = z.object({
  key: z.string().nullable(),
  kind: z.string(),
  recordCount: z.string().nullable(),
  withValueCount: z.string().nullable(),
  valueAwardedSum: z.string().nullable(),
  shareOfScope: z.string().nullable(),
})
export type RawProcurementBreakdownBucket = z.infer<
  typeof rawBreakdownBucketSchema
>

export const rawBreakdownBlockSchema = z.object({
  grain: z.string(),
  dimension: z.string(),
  rankedBy: z.string().nullable(),
  buckets: z.array(rawBreakdownBucketSchema).nullable(),
  meta: rawAnswerMetaSchema,
})
export type RawProcurementBreakdownBlock = z.infer<
  typeof rawBreakdownBlockSchema
>

const BREAKDOWN_BLOCK_FIELDS = /* GraphQL */ `
  grain dimension rankedBy
  buckets { key kind recordCount withValueCount valueAwardedSum shareOfScope }
  meta { ${ANSWER_META_FIELDS} }
`

export const rawSeriesBlockSchema = z.object({
  grain: z.string(),
  measure: z.string(),
  bucket: z.string(),
  points: z
    .array(z.object({ bucket: z.string(), value: z.string().nullable() }))
    .nullable(),
  meta: rawAnswerMetaSchema,
})
export type RawProcurementSeriesBlock = z.infer<typeof rawSeriesBlockSchema>

const SERIES_BLOCK_FIELDS = /* GraphQL */ `
  grain measure bucket points { bucket value }
  meta { ${ANSWER_META_FIELDS} }
`

// ---------------------------------------------------------------------------
// Search pages (offset)
// ---------------------------------------------------------------------------

const rawPageFields = {
  total: z.number().nullable(),
  totalEstimated: z.boolean(),
}

export const PROCUREMENT_PROCEDURES_QUERY = /* GraphQL */ `
  query ProcurementProcedures($filter: ProcurementProceduresFilter, $sort: ProcurementSort, $page: Int, $pageSize: Int) {
    procurementProcedures(filter: $filter, sort: $sort, page: $page, pageSize: $pageSize) {
      total totalEstimated
      items { ${PROCEDURE_FIELDS} }
    }
  }
`
export const procurementProceduresResponseSchema = z.object({
  procurementProcedures: z.object({
    ...rawPageFields,
    items: z.array(rawProcedureSchema),
  }),
})

export const PROCUREMENT_CONTRACTS_QUERY = /* GraphQL */ `
  query ProcurementContracts($filter: ProcurementContractsFilter, $sort: ProcurementSort, $page: Int, $pageSize: Int) {
    procurementContracts(filter: $filter, sort: $sort, page: $page, pageSize: $pageSize) {
      total totalEstimated
      items { ${CONTRACT_FIELDS} }
    }
  }
`
export const procurementContractsResponseSchema = z.object({
  procurementContracts: z.object({
    ...rawPageFields,
    items: z.array(rawContractSchema),
  }),
})

export const PROCUREMENT_DIRECT_ACQUISITIONS_QUERY = /* GraphQL */ `
  query ProcurementDirectAcquisitions($filter: ProcurementDirectAcquisitionsFilter, $sort: ProcurementSort, $page: Int, $pageSize: Int) {
    procurementDirectAcquisitions(filter: $filter, sort: $sort, page: $page, pageSize: $pageSize) {
      total totalEstimated
      items { ${DIRECT_ACQUISITION_FIELDS} }
    }
  }
`
export const procurementDirectAcquisitionsResponseSchema = z.object({
  procurementDirectAcquisitions: z.object({
    ...rawPageFields,
    items: z.array(rawDirectAcquisitionSchema),
  }),
})

export const PROCUREMENT_MODIFICATIONS_QUERY = /* GraphQL */ `
  query ProcurementModifications($filter: ProcurementModificationsFilter, $sort: ProcurementSort, $page: Int, $pageSize: Int) {
    procurementModifications(filter: $filter, sort: $sort, page: $page, pageSize: $pageSize) {
      total totalEstimated
      items { ${MODIFICATION_FIELDS} }
    }
  }
`
export const procurementModificationsResponseSchema = z.object({
  procurementModifications: z.object({
    ...rawPageFields,
    items: z.array(rawModificationSchema),
  }),
})

// ---------------------------------------------------------------------------
// Detail bundles
// ---------------------------------------------------------------------------

const rawDuplicateRefSchema = z.object({
  sourceSystem: z.string(),
  id: z.string(),
})

const rawLotWinnerSchema = z.object({
  lotLabel: z.string(),
  winner: rawPartySchema,
  valueRon: z.string().nullable(),
  currency: z.string().nullable(),
  isRon: z.boolean(),
  valueSuspect: z.boolean(),
})

const rawTedRefSchema = z.object({
  tedNoticeNo: z.string(),
  sourceUrl: z.string(),
})

const DETAIL_SHARED_FIELDS = /* GraphQL */ `duplicates { sourceSystem id }`

export const PROCUREMENT_PROCEDURE_DETAIL_QUERY = /* GraphQL */ `
  query ProcurementProcedureDetail($id: ID!) {
    procurementProcedure(id: $id) {
      procedure { ${PROCEDURE_FIELDS} }
      contracts { ${CONTRACT_FIELDS} }
      perLotWinners {
        lotLabel
        winner { ${PARTY_FIELDS} }
        valueRon currency isRon valueSuspect
      }
      ted { tedNoticeNo sourceUrl }
      ${DETAIL_SHARED_FIELDS}
    }
  }
`
export const procurementProcedureDetailResponseSchema = z.object({
  procurementProcedure: z
    .object({
      procedure: rawProcedureSchema,
      contracts: z.array(rawContractSchema),
      perLotWinners: z.array(rawLotWinnerSchema).nullable(),
      ted: rawTedRefSchema.nullable(),
      duplicates: z.array(rawDuplicateRefSchema),
    })
    .nullable(),
})
export type RawProcurementProcedureDetail = NonNullable<
  z.infer<typeof procurementProcedureDetailResponseSchema>['procurementProcedure']
>

export const PROCUREMENT_CONTRACT_DETAIL_QUERY = /* GraphQL */ `
  query ProcurementContractDetail($id: ID!) {
    procurementContract(id: $id) {
      contract { ${CONTRACT_FIELDS} }
      procedure { ${PROCEDURE_FIELDS} }
      ted { tedNoticeNo sourceUrl }
      ${DETAIL_SHARED_FIELDS}
    }
  }
`
export const procurementContractDetailResponseSchema = z.object({
  procurementContract: z
    .object({
      contract: rawContractSchema,
      procedure: rawProcedureSchema.nullable(),
      ted: rawTedRefSchema.nullable(),
      duplicates: z.array(rawDuplicateRefSchema),
    })
    .nullable(),
})
export type RawProcurementContractDetail = NonNullable<
  z.infer<typeof procurementContractDetailResponseSchema>['procurementContract']
>

export const PROCUREMENT_DA_DETAIL_QUERY = /* GraphQL */ `
  query ProcurementDirectAcquisitionDetail($id: ID!) {
    procurementDirectAcquisition(id: $id) {
      directAcquisition { ${DIRECT_ACQUISITION_FIELDS} }
      ${DETAIL_SHARED_FIELDS}
    }
  }
`
export const procurementDaDetailResponseSchema = z.object({
  procurementDirectAcquisition: z
    .object({
      directAcquisition: rawDirectAcquisitionSchema,
      duplicates: z.array(rawDuplicateRefSchema),
    })
    .nullable(),
})
export type RawProcurementDaDetail = NonNullable<
  z.infer<typeof procurementDaDetailResponseSchema>['procurementDirectAcquisition']
>

// ---------------------------------------------------------------------------
// Aggregates (multi-root document reused for landing / CPV page / supplier
// slice — only the $scope/$grain variables change)
// ---------------------------------------------------------------------------

export const PROCUREMENT_AGGREGATES_QUERY = /* GraphQL */ `
  query ProcurementAggregates(
    $scope: ProcurementAnalysisScopeInput
    $topN: Int
    $includeSuppliers: Boolean!
    $includeCategories: Boolean!
  ) {
    procurementStats(scope: $scope) { blocks { ${STATS_BLOCK_FIELDS} } }
    authorities: procurementBreakdown(scope: $scope, dimension: authority, topN: $topN) { ${BREAKDOWN_BLOCK_FIELDS} }
    suppliers: procurementBreakdown(scope: $scope, dimension: supplier, topN: $topN) @include(if: $includeSuppliers) { ${BREAKDOWN_BLOCK_FIELDS} }
    categories: procurementBreakdown(scope: $scope, dimension: cpvDivision, topN: $topN) @include(if: $includeCategories) { ${BREAKDOWN_BLOCK_FIELDS} }
    recordSeries: procurementSeries(scope: $scope, bucket: month, measure: recordCount) { ${SERIES_BLOCK_FIELDS} }
    valueSeries: procurementSeries(scope: $scope, bucket: month, measure: valueAwardedSum) { ${SERIES_BLOCK_FIELDS} }
  }
`
export const procurementAggregatesResponseSchema = z.object({
  procurementStats: z.object({ blocks: z.array(rawStatsBlockSchema) }),
  authorities: z.array(rawBreakdownBlockSchema),
  suppliers: z.array(rawBreakdownBlockSchema).optional().default([]),
  categories: z.array(rawBreakdownBlockSchema).optional().default([]),
  recordSeries: z.array(rawSeriesBlockSchema),
  valueSeries: z.array(rawSeriesBlockSchema),
})
export type RawProcurementAggregates = z.infer<
  typeof procurementAggregatesResponseSchema
>

// ---------------------------------------------------------------------------
// Party identity enrichment
// ---------------------------------------------------------------------------

const rawPartyNameNodeSchema = z.object({
  cui: z.string(),
  name: z.string(),
})

const rawPartyNameConnectionSchema = z.object({
  edges: z.array(z.object({ node: rawPartyNameNodeSchema })),
})

export const PROCUREMENT_PARTY_NAMES_QUERY = /* GraphQL */ `
  query ProcurementPartyNames(
    $authorityCuis: [String!]!
    $supplierCuis: [String!]!
    $includeAuthorities: Boolean!
    $includeSuppliers: Boolean!
  ) {
    authorities: referencePublicEntities(
      filter: { cui: { in: $authorityCuis } }
      first: 50
    ) @include(if: $includeAuthorities) {
      edges { node { cui name } }
    }
    suppliers: companies(
      filter: { cui: { in: $supplierCuis } }
      first: 50
    ) @include(if: $includeSuppliers) {
      edges { node { cui name } }
    }
  }
`

export const procurementPartyNamesResponseSchema = z.object({
  authorities: rawPartyNameConnectionSchema.optional(),
  suppliers: rawPartyNameConnectionSchema.optional(),
})


// ---------------------------------------------------------------------------
// Matrix-v2 analysis workspace
// ---------------------------------------------------------------------------

export const PROCUREMENT_ANALYSIS_QUERY = /* GraphQL */ `
  query ProcurementAnalysis(
    $scope: ProcurementAnalysisScopeInput!
    $dimensions: [ProcurementBreakdownDimension!]!
    $topN: Int
    $bucket: ProcurementSeriesBucket!
    $measure: ProcurementAnalysisMeasure!
    $basis: ProcurementConcentrationBasis
  ) {
    stats: procurementStats(scope: $scope) { blocks { ${STATS_BLOCK_FIELDS} } }
    facets: procurementFacets(scope: $scope, dimensions: $dimensions, topN: $topN) {
      blocks { ${BREAKDOWN_BLOCK_FIELDS} }
    }
    series: procurementSeries(scope: $scope, bucket: $bucket, measure: $measure) {
      ${SERIES_BLOCK_FIELDS}
    }
    concentration: procurementConcentration(scope: $scope, basis: $basis) {
      grain basis supplierCount top1Share top5Share hhi totalRon
      meta { ${ANSWER_META_FIELDS} }
    }
  }
`

export const rawConcentrationBlockSchema = z.object({
  grain: z.string(),
  basis: z.string(),
  supplierCount: z.number().nullable(),
  top1Share: z.string().nullable(),
  top5Share: z.string().nullable(),
  hhi: z.string().nullable(),
  totalRon: z.string().nullable(),
  meta: rawAnswerMetaSchema,
})

export const procurementAnalysisResponseSchema = z.object({
  stats: z.object({ blocks: z.array(rawStatsBlockSchema) }),
  facets: z.object({ blocks: z.array(rawBreakdownBlockSchema) }),
  series: z.array(rawSeriesBlockSchema),
  concentration: z.array(rawConcentrationBlockSchema),
})
export type RawProcurementAnalysis = z.infer<
  typeof procurementAnalysisResponseSchema
>

// ---------------------------------------------------------------------------
// Supplier records connection (cursor)
// ---------------------------------------------------------------------------

const rawFlowRecordSchema = z.discriminatedUnion('__typename', [
  rawContractSchema.extend({ __typename: z.literal('ProcurementContract') }),
  rawDirectAcquisitionSchema.extend({
    __typename: z.literal('ProcurementDirectAcquisition'),
  }),
])
export type RawProcurementFlowRecord = z.infer<typeof rawFlowRecordSchema>

export const PROCUREMENT_SUPPLIER_RECORDS_QUERY = /* GraphQL */ `
  query ProcurementSupplierRecords($supplierCui: ID!, $first: Int, $after: String) {
    procurementSupplierRecords(supplierCui: $supplierCui, first: $first, after: $after) {
      total
      edges {
        cursor
        node {
          __typename
          ... on ProcurementContract { ${CONTRACT_FIELDS} }
          ... on ProcurementDirectAcquisition { ${DIRECT_ACQUISITION_FIELDS} }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`
export const procurementSupplierRecordsResponseSchema = z.object({
  procurementSupplierRecords: z.object({
    total: z.number().nullable(),
    edges: z.array(
      z.object({
        cursor: z.string(),
        node: rawFlowRecordSchema,
      }),
    ),
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
  }),
})
export type RawProcurementSupplierRecordsConnection = z.infer<
  typeof procurementSupplierRecordsResponseSchema
>['procurementSupplierRecords']

export const PROCUREMENT_CPV_DIVISIONS_QUERY = /* GraphQL */ `
  query ProcurementCpvDivisions {
    procurementCpvDivisions { divisionCode labelEn labelRo }
  }
`
export const rawCpvDivisionSchema = z.object({
  divisionCode: z.string(),
  labelEn: z.string(),
  labelRo: z.string().nullable(),
})
export type RawProcurementCpvDivision = z.infer<typeof rawCpvDivisionSchema>
export const procurementCpvDivisionsResponseSchema = z.object({
  procurementCpvDivisions: z.array(rawCpvDivisionSchema),
})
