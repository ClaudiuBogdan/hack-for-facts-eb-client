/** Live-only procurement facade. There is intentionally no fixture fallback. */
export type {
  ProcurementAuthoritySliceScope,
  ProcurementSliceScope,
} from './procurement-api.live'
export {
  fetchAuthorityProcurementSliceLive as fetchProcurementAuthoritySlice,
  fetchProcurementSearchLive as fetchProcurementSearch,
  fetchSupplierDirectAnalyticsLive as fetchProcurementSupplierDirectAnalytics,
  fetchSupplierRecordsLive as fetchProcurementSupplierRecords,
} from './procurement-api.live'
