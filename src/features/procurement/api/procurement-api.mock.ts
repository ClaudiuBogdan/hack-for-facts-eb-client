import { procurementMockFixtures } from '../mocks/fixtures'
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

const NETWORK_DELAY_MS = 120

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS))
}

export async function fetchProcurementLandingMock(): Promise<ProcurementLanding> {
  await delay()
  return procurementMockFixtures.landing
}

export async function fetchProcurementSearchMock(
  params: ProcurementSearchState,
): Promise<ProcurementSearchPage> {
  await delay()
  return procurementMockFixtures.searchForParams(params)
}

export async function fetchProcedureDetailMock(
  id: string,
): Promise<ProcurementRecordDetail<ProcedureRecord>> {
  await delay()
  return procurementMockFixtures.procedureDetail(id)
}

export async function fetchContractDetailMock(
  id: string,
): Promise<ProcurementRecordDetail<ContractRecord>> {
  await delay()
  return procurementMockFixtures.contractDetail(id)
}

export async function fetchDirectAcquisitionDetailMock(
  id: string,
): Promise<ProcurementRecordDetail<DirectAcquisitionRecord>> {
  await delay()
  return procurementMockFixtures.directAcquisitionDetail(id)
}

export async function fetchCpvCategoryPageMock(
  code: string,
): Promise<CpvCategoryPage> {
  await delay()
  return procurementMockFixtures.cpvPage(code)
}

export async function fetchSupplierProcurementSliceMock(
  cui: string,
): Promise<SupplierProcurementSlice> {
  await delay()
  return procurementMockFixtures.supplierSlice(cui)
}
