import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getPublicInvestmentsMockStatus,
  isPublicInvestmentsMockEnabled,
} from './mock-mode'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('public investments mock mode', () => {
  it('is disabled by default so the API can return a typed blocked result', () => {
    expect(isPublicInvestmentsMockEnabled()).toBe(false)
    expect(getPublicInvestmentsMockStatus()).toBe('live-not-connected')
  })

  it('accepts the catalog-backed feature umbrella id', () => {
    vi.stubEnv('VITE_MOCK_DATASETS', 'public-investments')

    expect(isPublicInvestmentsMockEnabled()).toBe(true)
    expect(getPublicInvestmentsMockStatus()).toBe('mock-enabled')
  })

  it('accepts source-lane catalog ids', () => {
    vi.stubEnv('VITE_MOCK_DATASETS', 'investments-anghel-saligny')

    expect(isPublicInvestmentsMockEnabled()).toBe(true)
  })

  it('does not enable fixtures for unrelated scoped ids', () => {
    vi.stubEnv('VITE_MOCK_DATASETS', 'ngo-core')

    expect(isPublicInvestmentsMockEnabled()).toBe(false)
  })
})
