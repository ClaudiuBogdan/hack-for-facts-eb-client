/**
 * GraphQL documents + raw-response Zod schemas for the procurement front door
 * (`/procurement`). The analysis reads are multi-root on purpose: the whole
 * national picture is one request (~0.8 s on the dev API), the category tree
 * another; party names follow in the feature's bounded name lookup.
 */
import { z } from 'zod'
import { CPV_DRILL } from '../../lib/home-categories'

/** Decimal strings from the API, as numbers; null stays null (unknown, never 0). */
const decimal = z
  .string()
  .nullable()
  .transform((value) => (value === null ? null : Number(value)))

export const homeStatsBlockSchema = z.object({
  recordCount: decimal,
  withValueCount: decimal,
  valueAwardedSum: decimal,
})

export const homeBucketSchema = z.object({
  key: z.string().nullable(),
  kind: z.string(),
  recordCount: decimal,
  valueSum: decimal,
  shareOfScope: decimal,
})

export const homeBreakdownBlockSchema = z.object({
  rankedBy: z.string().nullable(),
  buckets: z.array(homeBucketSchema).nullable(),
  valueWithheldAssociationSum: decimal.optional(),
})

export const homeSeriesBlockSchema = z.object({
  points: z.array(z.object({ bucket: z.string(), value: decimal })).nullable(),
})

const STATS = 'recordCount withValueCount valueAwardedSum'
const BREAKDOWN = 'rankedBy buckets { key kind recordCount valueSum shareOfScope } valueWithheldAssociationSum'
const SERIES = 'points { bucket value }'

// ───────────────────────────────────────────────── the national picture ──

export const PROCUREMENT_HOME_NATIONAL_QUERY = /* GraphQL */ `
  query ProcurementHomeNational(
    $awards: ProcurementAnalysisScopeInput!
    $frameworks: ProcurementAnalysisScopeInput!
    $direct: ProcurementAnalysisScopeInput!
    $directYears: ProcurementAnalysisScopeInput!
    $awardsMonths: ProcurementAnalysisScopeInput!
    $directMonths: ProcurementAnalysisScopeInput!
  ) {
    awards: procurementStats(scope: $awards) { blocks { ${STATS} } }
    frameworks: procurementStats(scope: $frameworks) { blocks { ${STATS} } }
    direct: procurementStats(scope: $direct) { blocks { ${STATS} } }
    awardsBuyerCount: procurementSeries(scope: $awards, bucket: year, measure: distinctAuthorities) { ${SERIES} }
    directBuyerCount: procurementSeries(scope: $direct, bucket: year, measure: distinctAuthorities) { ${SERIES} }
    awardsSellerCount: procurementSeries(scope: $awards, bucket: year, measure: distinctSuppliers) { ${SERIES} }
    directSellerCount: procurementSeries(scope: $direct, bucket: year, measure: distinctSuppliers) { ${SERIES} }
    directYearValue: procurementSeries(scope: $directYears, bucket: year, measure: valueAwardedSum) { ${SERIES} }
    directYearCount: procurementSeries(scope: $directYears, bucket: year, measure: recordCount) { ${SERIES} }
    awardsMonthCount: procurementSeries(scope: $awardsMonths, bucket: month, measure: recordCount) { ${SERIES} }
    directMonthCount: procurementSeries(scope: $directMonths, bucket: month, measure: recordCount) { ${SERIES} }
    directMonthValue: procurementSeries(scope: $directMonths, bucket: month, measure: valueAwardedSum) { ${SERIES} }
    awardsBuyers: procurementBreakdown(scope: $awards, dimension: authority, topN: 10, rankBy: count) { ${BREAKDOWN} }
    directBuyers: procurementBreakdown(scope: $direct, dimension: authority, topN: 10, rankBy: value) { ${BREAKDOWN} }
    awardsSellers: procurementBreakdown(scope: $awards, dimension: supplier, topN: 1, rankBy: value) { ${BREAKDOWN} }
    directSellers: procurementBreakdown(scope: $direct, dimension: supplier, topN: 10, rankBy: value) { ${BREAKDOWN} }
    procedures: procurementBreakdown(scope: $awards, dimension: procedureType, topN: 12, rankBy: count) { ${BREAKDOWN} }
    awardsCounties: procurementBreakdown(scope: $awards, dimension: buyerCounty, topN: 50, rankBy: count) { ${BREAKDOWN} }
    directCounties: procurementBreakdown(scope: $direct, dimension: buyerCounty, topN: 50, rankBy: value) { ${BREAKDOWN} }
  }
`

const statsResult = z.object({ blocks: z.array(homeStatsBlockSchema) })
const series = z.array(homeSeriesBlockSchema)
const breakdown = z.array(homeBreakdownBlockSchema)

export const procurementHomeNationalResponseSchema = z.object({
  awards: statsResult,
  frameworks: statsResult,
  direct: statsResult,
  awardsBuyerCount: series,
  directBuyerCount: series,
  awardsSellerCount: series,
  directSellerCount: series,
  directYearValue: series,
  directYearCount: series,
  awardsMonthCount: series,
  directMonthCount: series,
  directMonthValue: series,
  awardsBuyers: breakdown,
  directBuyers: breakdown,
  awardsSellers: breakdown,
  directSellers: breakdown,
  procedures: breakdown,
  awardsCounties: breakdown,
  directCounties: breakdown,
})
export type RawProcurementHomeNational = z.infer<typeof procurementHomeNationalResponseSchema>

// ────────────────────────────────────────────────── the category tree ──

/** Every refinement for both populations, plus the roads category's suppliers (for its consortium share). */
export function procurementHomeCategoriesQuery(roadsPrefixes: number): string {
  const declarations: string[] = []
  const fields: string[] = []
  for (const grain of ['awards', 'direct'] as const) {
    declarations.push(`$${grain}Divisions: ProcurementAnalysisScopeInput!`)
    fields.push(`${grain}Divisions: procurementBreakdown(scope: $${grain}Divisions, dimension: cpvDivision, topN: 60, rankBy: value) { ${BREAKDOWN} }`)
    for (const drill of CPV_DRILL) {
      const alias = `${grain}_${drill.key}`
      declarations.push(`$${alias}: ProcurementAnalysisScopeInput!`)
      fields.push(`${alias}: procurementBreakdown(scope: $${alias}, dimension: ${drill.dimension}, topN: 60, rankBy: value) { ${BREAKDOWN} }`)
    }
  }
  for (let index = 0; index < roadsPrefixes; index += 1) {
    declarations.push(`$roads${index}: ProcurementAnalysisScopeInput!`)
    fields.push(`roads${index}: procurementBreakdown(scope: $roads${index}, dimension: supplier, topN: 1, rankBy: value) { ${BREAKDOWN} }`)
  }
  return `query ProcurementHomeCategories(${declarations.join(', ')}) {\n  ${fields.join('\n  ')}\n}`
}

export const procurementHomeCategoriesResponseSchema = z.record(z.string(), breakdown)

// ───────────────────────────────────────────────── records, one per row ──

const party = z.object({ cui: z.string().nullable(), name: z.string().nullable(), displayName: z.string().nullable() })
const resolvedValue = z.object({ valueAccepted: z.boolean(), valueRonComparable: z.string().nullable() })

export const homeContractItemSchema = z.object({
  id: z.string(),
  contractNo: z.string().nullable(),
  contractDate: z.string().nullable(),
  title: z.string().nullable(),
  cpvCode: z.string().nullable(),
  authority: party,
  supplier: party,
  value: resolvedValue,
})

export const homeDirectItemSchema = z.object({
  id: z.string(),
  publicationDate: z.string().nullable(),
  finalizationDate: z.string().nullable(),
  title: z.string().nullable(),
  cpvCode: z.string().nullable(),
  authority: party,
  supplier: party,
  value: resolvedValue,
})

const PARTY = 'cui name displayName'
const VALUE = 'valueAccepted valueRonComparable'

export const PROCUREMENT_HOME_CONTRACTS_QUERY = /* GraphQL */ `
  query ProcurementHomeContracts($filter: ProcurementContractsFilter, $page: Int, $rows: Int) {
    procurementContracts(filter: $filter, sort: value_desc, page: $page, pageSize: $rows) {
      items { id contractNo contractDate title cpvCode authority { ${PARTY} } supplier { ${PARTY} } value { ${VALUE} } }
    }
  }
`

export const procurementHomeContractsResponseSchema = z.object({
  procurementContracts: z.object({ items: z.array(homeContractItemSchema) }),
})

export const PROCUREMENT_HOME_DIRECT_QUERY = /* GraphQL */ `
  query ProcurementHomeDirect($filter: ProcurementDirectAcquisitionsFilter, $rows: Int) {
    procurementDirectAcquisitions(filter: $filter, sort: value_desc, page: 1, pageSize: $rows) {
      items { id publicationDate finalizationDate title cpvCode authority { ${PARTY} } supplier { ${PARTY} } value { ${VALUE} } }
    }
  }
`

export const procurementHomeDirectResponseSchema = z.object({
  procurementDirectAcquisitions: z.object({ items: z.array(homeDirectItemSchema) }),
})
