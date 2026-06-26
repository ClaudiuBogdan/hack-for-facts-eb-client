import { assertLiveApiAvailable } from '@/lib/scraper-references/mock-mode'
import type {
  CpvCategoryPage,
  ProcurementLanding,
  ProcurementRecordDetail,
  ProcurementSearchPage,
  SupplierProcurementSlice,
  ContractRecord,
  ProcedureRecord,
  DirectAcquisitionRecord,
} from '@/schemas/procurement'
import type { ProcurementSearchState } from '@/schemas/procurement-search'

const DATASET = 'public-contracts-seap'
const LIVE_API_ERROR = 'Procurement live API (public-contracts-seap) is not connected yet.'

function unavailableLiveApi(): never {
  assertLiveApiAvailable(DATASET, LIVE_API_ERROR)
  throw new Error(LIVE_API_ERROR)
}

export async function fetchProcurementLandingLive(): Promise<ProcurementLanding> {
  return unavailableLiveApi()
}

export async function fetchProcurementSearchLive(
  _params: ProcurementSearchState,
): Promise<ProcurementSearchPage> {
  return unavailableLiveApi()
}

export async function fetchProcedureDetailLive(
  _id: string,
): Promise<ProcurementRecordDetail<ProcedureRecord>> {
  return unavailableLiveApi()
}

export async function fetchContractDetailLive(
  _id: string,
): Promise<ProcurementRecordDetail<ContractRecord>> {
  return unavailableLiveApi()
}

export async function fetchDirectAcquisitionDetailLive(
  _id: string,
): Promise<ProcurementRecordDetail<DirectAcquisitionRecord>> {
  return unavailableLiveApi()
}

export async function fetchCpvCategoryPageLive(
  _code: string,
): Promise<CpvCategoryPage> {
  return unavailableLiveApi()
}

export async function fetchSupplierProcurementSliceLive(
  _cui: string,
): Promise<SupplierProcurementSlice> {
  return unavailableLiveApi()
}
