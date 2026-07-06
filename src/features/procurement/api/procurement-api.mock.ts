/**
 * Mock procurement adapters — thin wrappers over `procurementMockFixtures`
 * (self-validating, schema-parsed at module init) with a small simulated
 * network delay. Shapes are identical to the live adapter's.
 */
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
  SupplierRecordsPage,
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
): Promise<ProcurementRecordDetail<ProcedureRecord> | null> {
  await delay()
  return procurementMockFixtures.procedureDetail(id)
}

export async function fetchContractDetailMock(
  id: string,
): Promise<ProcurementRecordDetail<ContractRecord> | null> {
  await delay()
  return procurementMockFixtures.contractDetail(id)
}

export async function fetchDirectAcquisitionDetailMock(
  id: string,
): Promise<ProcurementRecordDetail<DirectAcquisitionRecord> | null> {
  await delay()
  return procurementMockFixtures.directAcquisitionDetail(id)
}

export async function fetchCpvCategoryPageMock(
  code: string,
): Promise<CpvCategoryPage | null> {
  await delay()
  return procurementMockFixtures.cpvPage(code)
}

export async function fetchSupplierProcurementSliceMock(
  cui: string,
): Promise<SupplierProcurementSlice> {
  await delay()
  return procurementMockFixtures.supplierSlice(cui)
}

export async function fetchSupplierRecordsMock(
  cui: string,
  after?: string,
): Promise<SupplierRecordsPage> {
  await delay()
  return procurementMockFixtures.supplierRecords(cui, after)
}
