import {
  fetchProcurementContractDetail,
  fetchProcurementDirectAcquisitionDetail,
  fetchProcurementProcedureDetail,
} from '../api/procurement-api'
import type { ProcurementRecordDetail } from '@/schemas/procurement'
import type { DetailGrainKey, DetailRecord } from './detail-config'

/**
 * One fetcher per grain. Kept as a map rather than a `switch` at each call
 * site so the route loader and the page query resolve the same fetcher — and
 * therefore the same query key — from the same grain.
 *
 * Its own module because both the query-options builder (hooks) and the route
 * loader (which fetches directly while server-rendering) need it, and routing
 * it through the hooks module would make that import cycle.
 */
export type RecordDetailFetcher = (
  id: string,
) => Promise<ProcurementRecordDetail<DetailRecord> | null>

// Annotated rather than `satisfies`: `satisfies` keeps each entry's narrow
// per-grain record type, so indexing with a `DetailGrainKey` union yields a
// union of incompatible signatures that no single `queryFn` can satisfy.
export const RECORD_DETAIL_FETCHERS: Record<DetailGrainKey, RecordDetailFetcher> = {
  procedures: fetchProcurementProcedureDetail,
  contracts: fetchProcurementContractDetail,
  direct_acquisitions: fetchProcurementDirectAcquisitionDetail,
}
