import type {
  CpvCategoryPage,
  ContractRecord,
  DirectAcquisitionRecord,
  ProcurementLanding,
  ProcurementRecordDetail,
  ProcurementSearchPage,
  ProcedureRecord,
  SupplierProcurementSlice,
} from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'
import { isProcurementMockEnabled } from '../lib/mock-mode'
import {
  fetchContractDetailMock,
  fetchCpvCategoryPageMock,
  fetchDirectAcquisitionDetailMock,
  fetchProcurementLandingMock,
  fetchProcurementSearchMock,
  fetchProcedureDetailMock,
  fetchSupplierProcurementSliceMock,
} from './procurement-api.mock'
import {
  fetchContractDetailLive,
  fetchCpvCategoryPageLive,
  fetchDirectAcquisitionDetailLive,
  fetchProcurementLandingLive,
  fetchProcurementSearchLive,
  fetchProcedureDetailLive,
  fetchSupplierProcurementSliceLive,
} from './procurement-api.live'

/**
 * Procurement API facade. Mock-first: defaults to mock adapters for the
 * `public-contracts-seap` dataset until the live GraphQL module is wired
 * (catalog `apiReady: false`). The visible UI must show a
 * `DataStatusBadge(status="mock")` while in mock mode.
 */
export const procurementApi = {
  isMock: isProcurementMockEnabled(),

  fetchLanding(): Promise<ProcurementLanding> {
    return this.isMock
      ? fetchProcurementLandingMock()
      : fetchProcurementLandingLive()
  },

  fetchSearch(params: ProcurementSearchState): Promise<ProcurementSearchPage> {
    return this.isMock
      ? fetchProcurementSearchMock(params)
      : fetchProcurementSearchLive(params)
  },

  fetchProcedureDetail(
    id: string,
  ): Promise<ProcurementRecordDetail<ProcedureRecord>> {
    return this.isMock
      ? fetchProcedureDetailMock(id)
      : fetchProcedureDetailLive(id)
  },

  fetchContractDetail(
    id: string,
  ): Promise<ProcurementRecordDetail<ContractRecord>> {
    return this.isMock
      ? fetchContractDetailMock(id)
      : fetchContractDetailLive(id)
  },

  fetchDirectAcquisitionDetail(
    id: string,
  ): Promise<ProcurementRecordDetail<DirectAcquisitionRecord>> {
    return this.isMock
      ? fetchDirectAcquisitionDetailMock(id)
      : fetchDirectAcquisitionDetailLive(id)
  },

  fetchCpvCategoryPage(code: string): Promise<CpvCategoryPage> {
    return this.isMock
      ? fetchCpvCategoryPageMock(code)
      : fetchCpvCategoryPageLive(code)
  },

  fetchSupplierSlice(cui: string): Promise<SupplierProcurementSlice> {
    return this.isMock
      ? fetchSupplierProcurementSliceMock(cui)
      : fetchSupplierProcurementSliceLive(cui)
  },
} as const

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const procurementQueryKeys = {
  landing: () => ['procurement', 'landing'] as const,
  search: (params: ProcurementSearchState) =>
    ['procurement', 'search', params] as const,
  procedureDetail: (id: string) =>
    ['procurement', 'procedure', id] as const,
  contractDetail: (id: string) =>
    ['procurement', 'contract', id] as const,
  directAcquisitionDetail: (id: string) =>
    ['procurement', 'direct-acquisition', id] as const,
  cpvCategory: (code: string) => ['procurement', 'cpv', code] as const,
  supplierSlice: (cui: string) =>
    ['procurement', 'supplier-slice', cui] as const,
} as const
