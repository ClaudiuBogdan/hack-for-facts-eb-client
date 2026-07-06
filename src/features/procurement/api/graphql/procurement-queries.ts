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

/** GraphQL selection for rollup count columns. */
const ROLLUP_COUNT_FIELDS = /* GraphQL */ `flowCount amountRonSum amountPresentCount amountMissingCount`

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

export const rawGateSchema = z.object({
  sourceGrain: z.string(),
  rowsCount: z.string(),
  authorityCuiCoverageRate: z.string(),
  supplierCuiCoverageRate: z.string(),
  amountCoverageRate: z.string(),
  cpvCoverageRate: z.string(),
  dateCoverageRate: z.string(),
  filterAnswersAllowed: z.boolean(),
  spendRankingsAllowed: z.boolean(),
  supplierRegionFiltersAllowed: z.boolean(),
  blockers: z.array(z.string()),
  dataAsOf: z.string().nullable(),
  cadence: z.string().nullable(),
})
export type RawProcurementGate = z.infer<typeof rawGateSchema>

const GATE_FIELDS = /* GraphQL */ `
  sourceGrain rowsCount
  authorityCuiCoverageRate supplierCuiCoverageRate
  amountCoverageRate cpvCoverageRate dateCoverageRate
  filterAnswersAllowed spendRankingsAllowed supplierRegionFiltersAllowed
  blockers dataAsOf cadence
`

export const rawStatsSchema = z.object({
  totalValueRon: z.string().nullable(),
  contractsCount: z.string(),
  directAcquisitionsCount: z.string(),
  proceduresCount: z.string(),
  buyersCount: z.string(),
  suppliersCount: z.string(),
  firstFlowDate: z.string().nullable(),
  lastFlowDate: z.string().nullable(),
})
export type RawProcurementStats = z.infer<typeof rawStatsSchema>

const STATS_FIELDS = /* GraphQL */ `
  totalValueRon contractsCount directAcquisitionsCount proceduresCount
  buyersCount suppliersCount firstFlowDate lastFlowDate
`

export const rawTopPartyRowSchema = z.object({
  authority: rawPartySchema.nullable(),
  supplier: rawPartySchema.nullable(),
  sourceGrain: z.string(),
  flowCount: z.string(),
  amountRonSum: z.string().nullable(),
  amountPresentCount: z.string(),
  amountMissingCount: z.string(),
  firstFlowDate: z.string().nullable(),
  lastFlowDate: z.string().nullable(),
  evidenceRefsSample: z.array(z.string()),
})
export type RawProcurementTopPartyRow = z.infer<typeof rawTopPartyRowSchema>

const TOP_PARTY_ROW_FIELDS = /* GraphQL */ `
  authority { ${PARTY_FIELDS} }
  supplier { ${PARTY_FIELDS} }
  sourceGrain ${ROLLUP_COUNT_FIELDS}
  firstFlowDate lastFlowDate evidenceRefsSample
`

export const rawCategoryRowSchema = z.object({
  cpvDivisionCode: z.string().nullable(),
  cpvDivisionLabelEn: z.string().nullable(),
  cpvDivisionLabelRo: z.string().nullable(),
  sourceGrain: z.string(),
  flowCount: z.string(),
  amountRonSum: z.string().nullable(),
  amountPresentCount: z.string(),
  amountMissingCount: z.string(),
})
export type RawProcurementCategoryRow = z.infer<typeof rawCategoryRowSchema>

const CATEGORY_ROW_FIELDS = /* GraphQL */ `
  cpvDivisionCode cpvDivisionLabelEn cpvDivisionLabelRo
  sourceGrain ${ROLLUP_COUNT_FIELDS}
`

export const rawMonthlyPointSchema = z.object({
  month: z.string(),
  flowCount: z.string(),
  amountRonSum: z.string().nullable(),
  amountPresentCount: z.string(),
  amountMissingCount: z.string(),
})
export type RawProcurementMonthlyPoint = z.infer<typeof rawMonthlyPointSchema>

const MONTHLY_POINT_FIELDS = /* GraphQL */ `month ${ROLLUP_COUNT_FIELDS}`

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

const DETAIL_SHARED_FIELDS = /* GraphQL */ `
  duplicates { sourceSystem id }
  gate { ${GATE_FIELDS} }
`

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
      gate: rawGateSchema,
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
      gate: rawGateSchema,
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
      gate: rawGateSchema,
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
  query ProcurementAggregates($scope: ProcurementScopeFilter, $grain: String, $topN: Int) {
    procurementStats(scope: $scope, grain: $grain) { ${STATS_FIELDS} }
    procurementTopAuthorities(scope: $scope, grain: $grain, topN: $topN) { ${TOP_PARTY_ROW_FIELDS} }
    procurementTopSuppliers(scope: $scope, grain: $grain, topN: $topN) { ${TOP_PARTY_ROW_FIELDS} }
    procurementCategoryBreakdown(scope: $scope, grain: $grain) { ${CATEGORY_ROW_FIELDS} }
    procurementSpendOverTime(scope: $scope, grain: $grain) { ${MONTHLY_POINT_FIELDS} }
  }
`
export const procurementAggregatesResponseSchema = z.object({
  procurementStats: rawStatsSchema,
  procurementTopAuthorities: z.array(rawTopPartyRowSchema),
  procurementTopSuppliers: z.array(rawTopPartyRowSchema),
  procurementCategoryBreakdown: z.array(rawCategoryRowSchema),
  procurementSpendOverTime: z.array(rawMonthlyPointSchema),
})
export type RawProcurementAggregates = z.infer<
  typeof procurementAggregatesResponseSchema
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

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export const PROCUREMENT_GRAIN_QUALITY_QUERY = /* GraphQL */ `
  query ProcurementGrainQuality {
    procurementGrainQuality { ${GATE_FIELDS} }
  }
`
export const procurementGrainQualityResponseSchema = z.object({
  procurementGrainQuality: z.array(rawGateSchema),
})

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
