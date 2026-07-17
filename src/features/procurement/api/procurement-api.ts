/** Live-only procurement facade. There is intentionally no fixture fallback. */
export {
  fetchContractDetailLive as fetchProcurementContractDetail,
  fetchCpvCategoryPageLive as fetchProcurementCpvCategoryPage,
  fetchDirectAcquisitionDetailLive as fetchProcurementDirectAcquisitionDetail,
  fetchProcurementLandingLive as fetchProcurementLanding,
  fetchProcurementSearchLive as fetchProcurementSearch,
  fetchProcedureDetailLive as fetchProcurementProcedureDetail,
  fetchSupplierProcurementSliceLive as fetchProcurementSupplierSlice,
  fetchSupplierRecordsLive as fetchProcurementSupplierRecords,
} from './procurement-api.live'
