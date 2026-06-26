import { afterEach, describe, expect, it, vi } from 'vitest'

import { isNgoMockEnabled } from './mock-mode'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isNgoMockEnabled', () => {
  it('defaults to mock mode while the live NGO API is not connected', () => {
    expect(isNgoMockEnabled()).toBe(true)
  })

  it('keeps mock-first mode when VITE_MOCK_DATASETS is empty', () => {
    vi.stubEnv('VITE_MOCK_DATASETS', '')

    expect(isNgoMockEnabled()).toBe(true)
  })

  it('keeps mock-first mode when scoped mock ids omit NGO', () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'false')
    vi.stubEnv('VITE_MOCK_DATASETS', 'public-investments')

    expect(isNgoMockEnabled()).toBe(true)
  })

  it('lets the explicit live flag reach the live stub', () => {
    vi.stubEnv('VITE_USE_MOCK_DATA', 'true')
    vi.stubEnv('VITE_NGO_USE_LIVE_API', 'true')

    expect(isNgoMockEnabled()).toBe(false)
  })
})
