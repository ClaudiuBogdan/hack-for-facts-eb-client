import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/mock-mode', () => ({
  isProcurementMockEnabled: vi.fn(() => true),
}))

vi.mock('./procurement-api.mock', () => ({
  fetchProcurementLandingMock: vi.fn(() => Promise.resolve('landing-mock')),
  fetchProcurementSearchMock: vi.fn(() => Promise.resolve('search-mock')),
  fetchProcedureDetailMock: vi.fn(() => Promise.resolve('procedure-mock')),
  fetchContractDetailMock: vi.fn(() => Promise.resolve('contract-mock')),
  fetchDirectAcquisitionDetailMock: vi.fn(() => Promise.resolve('da-mock')),
  fetchCpvCategoryPageMock: vi.fn(() => Promise.resolve('cpv-mock')),
  fetchSupplierProcurementSliceMock: vi.fn(() => Promise.resolve('slice-mock')),
  fetchSupplierRecordsMock: vi.fn(() => Promise.resolve('records-mock')),
}))

vi.mock('./procurement-api.live', () => ({
  fetchProcurementLandingLive: vi.fn(() => Promise.resolve('landing-live')),
  fetchProcurementSearchLive: vi.fn(() => Promise.resolve('search-live')),
  fetchProcedureDetailLive: vi.fn(() => Promise.resolve('procedure-live')),
  fetchContractDetailLive: vi.fn(() => Promise.resolve('contract-live')),
  fetchDirectAcquisitionDetailLive: vi.fn(() => Promise.resolve('da-live')),
  fetchCpvCategoryPageLive: vi.fn(() => Promise.resolve('cpv-live')),
  fetchSupplierProcurementSliceLive: vi.fn(() => Promise.resolve('slice-live')),
  fetchSupplierRecordsLive: vi.fn(() => Promise.resolve('records-live')),
}))

import { isProcurementMockEnabled } from '../lib/mock-mode'
import {
  fetchProcurementContractDetail,
  fetchProcurementLanding,
  fetchProcurementSupplierRecords,
  isProcurementMock,
} from './procurement-api'

const isProcurementMockEnabledMock = vi.mocked(isProcurementMockEnabled)

afterEach(() => {
  isProcurementMockEnabledMock.mockReset()
  isProcurementMockEnabledMock.mockReturnValue(true)
})

describe('procurement facade dispatch', () => {
  it('reads the current mock gate instead of a module-load snapshot', () => {
    isProcurementMockEnabledMock.mockReturnValue(true)
    expect(isProcurementMock()).toBe(true)

    isProcurementMockEnabledMock.mockReturnValue(false)
    expect(isProcurementMock()).toBe(false)
  })

  it('routes to the mock adapters while mock mode is on', async () => {
    isProcurementMockEnabledMock.mockReturnValue(true)
    await expect(fetchProcurementLanding()).resolves.toBe('landing-mock')
    await expect(fetchProcurementContractDetail('c1')).resolves.toBe(
      'contract-mock',
    )
    await expect(fetchProcurementSupplierRecords('123', '12')).resolves.toBe(
      'records-mock',
    )
  })

  it('routes to the live adapters when mock mode is off', async () => {
    isProcurementMockEnabledMock.mockReturnValue(false)
    await expect(fetchProcurementLanding()).resolves.toBe('landing-live')
    await expect(fetchProcurementContractDetail('c1')).resolves.toBe(
      'contract-live',
    )
    await expect(fetchProcurementSupplierRecords('123')).resolves.toBe(
      'records-live',
    )
  })
})
