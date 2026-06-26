import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/mock-mode', () => ({
  isProcurementMockEnabled: vi.fn(() => true),
}))

import { isProcurementMockEnabled } from '../lib/mock-mode'
import { procurementApi } from './procurement-api'

const isProcurementMockEnabledMock = vi.mocked(isProcurementMockEnabled)

afterEach(() => {
  isProcurementMockEnabledMock.mockReset()
  isProcurementMockEnabledMock.mockReturnValue(true)
})

describe('procurementApi mock gate', () => {
  it('reads the current mock gate instead of a module-load snapshot', () => {
    isProcurementMockEnabledMock.mockReturnValue(true)
    expect(procurementApi.isMock).toBe(true)

    isProcurementMockEnabledMock.mockReturnValue(false)
    expect(procurementApi.isMock).toBe(false)
  })
})
