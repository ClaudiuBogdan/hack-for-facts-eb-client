/** Live-only procurement facade. There is intentionally no fixture fallback. */
export type {
  ProcurementAuthoritySliceScope,
  ProcurementSliceScope,
} from './procurement-api.live'
export {
  fetchAuthorityProcurementSliceLive as fetchProcurementAuthoritySlice,
  fetchCpvCategoryPageLive as fetchProcurementCpvCategoryPage,
  fetchProcurementSearchLive as fetchProcurementSearch,
  fetchProcedureDetailLive as fetchProcurementProcedureDetail,
  fetchSupplierProcurementSliceLive as fetchProcurementSupplierSlice,
  fetchSupplierRecordsLive as fetchProcurementSupplierRecords,
} from './procurement-api.live'
