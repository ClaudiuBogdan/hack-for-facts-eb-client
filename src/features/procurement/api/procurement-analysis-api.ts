import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PROCUREMENT_ANALYSIS_QUERY,
  procurementAnalysisResponseSchema,
  type RawProcurementAnalysis,
} from './graphql/procurement-queries'
import type { ProcurementScopeFilterInput } from './graphql/procurement-filters'

export const procurementAnalysisDimensionSchema = z.enum([
  'authority',
  'supplier',
  'cpvDivision',
  'cpvGroup',
  'cpvClass',
  'cpvCategory',
  'cpvCode',
  'status',
  'procedureType',
  'recordKind',
  'buyerRegion',
  'buyerCounty',
  'buyerSiruta',
  'supplierRegion',
  'supplierCounty',
  'supplierSiruta',
])
export const procurementAnalysisBucketSchema = z.enum(['month', 'quarter', 'year'])
export const procurementAnalysisMeasureSchema = z.enum([
  'recordCount',
  'withValueCount',
  'valueAwardedSum',
  'valueEstimatedSum',
  'avgValueAwarded',
  'distinctSuppliers',
  'distinctAuthorities',
])

export type ProcurementAnalysisDimension = z.infer<
  typeof procurementAnalysisDimensionSchema
>
export type ProcurementAnalysisBucket = z.infer<
  typeof procurementAnalysisBucketSchema
>
export type ProcurementAnalysisMeasure = z.infer<
  typeof procurementAnalysisMeasureSchema
>

export type ProcurementAnalysisRequest = {
  readonly scope: ProcurementScopeFilterInput
  readonly dimension: ProcurementAnalysisDimension
  readonly bucket: ProcurementAnalysisBucket
  readonly measure: ProcurementAnalysisMeasure
  readonly topN?: number
  readonly basis?: 'count' | 'value'
  /** Facet sort basis — independent of series `measure` / concentration `basis`. */
  readonly rankBy?: 'count' | 'value'
}

/** Matrix-v2 dashboard request. Unsupported combinations surface as errors. */
export async function fetchProcurementAnalysis(
  request: ProcurementAnalysisRequest,
): Promise<RawProcurementAnalysis> {
  const data = await graphqlQuery<unknown>(
    PROCUREMENT_ANALYSIS_QUERY,
    {
      scope: request.scope,
      dimensions: [request.dimension],
      topN: request.topN ?? 10,
      rankBy:
        request.rankBy ??
        (request.basis === 'value' ? 'value' : 'count'),
      bucket: request.bucket,
      measure: request.measure,
      basis: request.basis ?? 'count',
    },
    { operationName: 'ProcurementAnalysis' },
  )
  return procurementAnalysisResponseSchema.parse(data)
}
