import { afterEach, describe, expect, it, vi } from 'vitest'

import { isElectionsMockEnabled } from './mock-mode'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isElectionsMockEnabled', () => {
  it('preserves default mock-first behavior when no scoped env is set', () => {
    expect(isElectionsMockEnabled()).toBe(true)
  })

  it('treats an empty scoped env as unset', () => {
    vi.stubEnv('VITE_MOCK_DATASETS', '')

    expect(isElectionsMockEnabled()).toBe(true)
  })

  it('enables elections fixtures with the catalog id when scoped', () => {
    vi.stubEnv('VITE_MOCK_DATASETS', 'elections')

    expect(isElectionsMockEnabled()).toBe(true)
  })

  it('disables elections fixtures when scoped to another dataset', () => {
    vi.stubEnv('VITE_MOCK_DATASETS', 'public-investments')

    expect(isElectionsMockEnabled()).toBe(false)
  })
})
