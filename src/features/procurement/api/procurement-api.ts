/**
 * Procurement API facade. Routes every call to the live GraphQL module or the
 * schema-parsed mock fixtures based on `isProcurementMockEnabled()` (mirrors
 * the parliament facade). UI components import only from here; the mock/live
 * split is invisible to them and the returned data shapes are identical.
 *
 * Mock-first for the `public-contracts-seap` dataset until the server ships
 * the contract in docs/design/procurement/graphql-api-spec.md. The visible UI
 * must show a `DataStatusBadge(status="mock")` while `isProcurementMock()` is
 * true.
 */
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
import { isProcurementMockEnabled } from '../lib/mock-mode'
import {
  fetchContractDetailMock,
  fetchCpvCategoryPageMock,
  fetchDirectAcquisitionDetailMock,
  fetchProcurementLandingMock,
  fetchProcurementSearchMock,
  fetchProcedureDetailMock,
  fetchSupplierProcurementSliceMock,
  fetchSupplierRecordsMock,
} from './procurement-api.mock'
import {
  fetchContractDetailLive,
  fetchCpvCategoryPageLive,
  fetchDirectAcquisitionDetailLive,
  fetchProcurementLandingLive,
  fetchProcurementSearchLive,
  fetchProcedureDetailLive,
  fetchSupplierProcurementSliceLive,
  fetchSupplierRecordsLive,
} from './procurement-api.live'

export function isProcurementMock(): boolean {
  return isProcurementMockEnabled()
}

export async function fetchProcurementLanding(): Promise<ProcurementLanding> {
  return isProcurementMockEnabled()
    ? fetchProcurementLandingMock()
    : fetchProcurementLandingLive()
}

export async function fetchProcurementSearch(
  params: ProcurementSearchState,
): Promise<ProcurementSearchPage> {
  return isProcurementMockEnabled()
    ? fetchProcurementSearchMock(params)
    : fetchProcurementSearchLive(params)
}

export async function fetchProcurementProcedureDetail(
  id: string,
): Promise<ProcurementRecordDetail<ProcedureRecord> | null> {
  return isProcurementMockEnabled()
    ? fetchProcedureDetailMock(id)
    : fetchProcedureDetailLive(id)
}

export async function fetchProcurementContractDetail(
  id: string,
): Promise<ProcurementRecordDetail<ContractRecord> | null> {
  return isProcurementMockEnabled()
    ? fetchContractDetailMock(id)
    : fetchContractDetailLive(id)
}

export async function fetchProcurementDirectAcquisitionDetail(
  id: string,
): Promise<ProcurementRecordDetail<DirectAcquisitionRecord> | null> {
  return isProcurementMockEnabled()
    ? fetchDirectAcquisitionDetailMock(id)
    : fetchDirectAcquisitionDetailLive(id)
}

export async function fetchProcurementCpvCategoryPage(
  code: string,
): Promise<CpvCategoryPage | null> {
  return isProcurementMockEnabled()
    ? fetchCpvCategoryPageMock(code)
    : fetchCpvCategoryPageLive(code)
}

export async function fetchProcurementSupplierSlice(
  cui: string,
): Promise<SupplierProcurementSlice> {
  return isProcurementMockEnabled()
    ? fetchSupplierProcurementSliceMock(cui)
    : fetchSupplierProcurementSliceLive(cui)
}

export async function fetchProcurementSupplierRecords(
  cui: string,
  after?: string,
): Promise<SupplierRecordsPage> {
  return isProcurementMockEnabled()
    ? fetchSupplierRecordsMock(cui, after)
    : fetchSupplierRecordsLive(cui, after)
}
