/** Live-only procurement facade. There is intentionally no fixture fallback. */
export type {
  ProcurementAuthoritySliceScope,
  ProcurementBasisAnalytics,
  ProcurementBasisOverviewRequest,
  ProcurementInstitutionScopes,
} from './procurement-api.live'
export {
  fetchProcurementBasisOverviewLive as fetchProcurementBasisOverview,
  fetchAuthorityProcurementSliceLive as fetchProcurementAuthoritySlice,
  fetchContractDetailLive as fetchProcurementContractDetail,
  fetchCpvCategoryPageLive as fetchProcurementCpvCategoryPage,
  fetchDirectAcquisitionDetailLive as fetchProcurementDirectAcquisitionDetail,
  fetchProcurementInstitutionOverviewLive as fetchProcurementInstitutionOverview,
  fetchProcurementLandingLive as fetchProcurementLanding,
  fetchProcurementTerritoryOverviewLive as fetchProcurementTerritoryOverview,
  fetchProcurementSearchLive as fetchProcurementSearch,
  fetchProcedureDetailLive as fetchProcurementProcedureDetail,
  fetchSupplierProcurementSliceLive as fetchProcurementSupplierSlice,
  fetchSupplierRecordsLive as fetchProcurementSupplierRecords,
} from './procurement-api.live'
