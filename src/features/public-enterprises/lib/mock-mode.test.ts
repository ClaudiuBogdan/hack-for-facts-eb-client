import { afterEach, describe, expect, it, vi } from 'vitest'

import { isPublicEnterpriseMockEnabled } from './mock-mode'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isPublicEnterpriseMockEnabled', () => {
  it('is disabled by default until the AMEPIP surface is explicitly mocked', () => {
    expect(isPublicEnterpriseMockEnabled()).toBe(false)
  })

  it('enables the full facade only for the AMEPIP core catalog id', () => {
    vi.stubEnv('VITE_MOCK_DATASETS', 'soe-amepip')

    expect(isPublicEnterpriseMockEnabled()).toBe(true)
  })

  it('does not let supplemental lanes imply core profile fixtures', () => {
    vi.stubEnv('VITE_MOCK_DATASETS', 'soe-sanctions')

    expect(isPublicEnterpriseMockEnabled()).toBe(false)
  })

  it('honors global mock mode', () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'true')

    expect(isPublicEnterpriseMockEnabled()).toBe(true)
  })
})
