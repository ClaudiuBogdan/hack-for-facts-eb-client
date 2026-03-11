import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAMPAIGN_ID,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  CAMPAIGN_PROGRESS_SCHEMA_VERSION,
} from '../constants'
import { CampaignProgressProvider, useCampaignProgress } from './use-campaign-progress'
import type { CampaignProgressSnapshot } from '../types'

let authState = {
  isLoaded: true,
  isSignedIn: false,
  user: null as null | { id: string },
}

const fetchCampaignProgressMock = vi.fn(async (_params?: unknown) => ({
  snapshot: createSnapshot(),
  cursor: undefined,
}))
const syncCampaignProgressMock = vi.fn(async (_params?: unknown) => {})

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('../api/campaign-progress', () => ({
  fetchCampaignProgress: (params: unknown) => fetchCampaignProgressMock(params),
  syncCampaignProgress: (params: unknown) => syncCampaignProgressMock(params),
}))

function createSnapshot(
  overrides: Partial<CampaignProgressSnapshot> = {},
): CampaignProgressSnapshot {
  return {
    version: CAMPAIGN_PROGRESS_SCHEMA_VERSION,
    campaignId: CAMPAIGN_ID,
    onboardingCompletedAt: null,
    selectedLocality: null,
    selectedEntityCui: null,
    activeChallengeModuleSlug: null,
    challenges: {},
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function Wrapper({ children }: { readonly children: ReactNode }) {
  return <CampaignProgressProvider>{children}</CampaignProgressProvider>
}

describe('use-campaign-progress', () => {
  beforeEach(() => {
    window.localStorage.clear()
    authState = {
      isLoaded: true,
      isSignedIn: false,
      user: null,
    }
    fetchCampaignProgressMock.mockClear()
    syncCampaignProgressMock.mockClear()
    fetchCampaignProgressMock.mockResolvedValue({
      snapshot: createSnapshot(),
      cursor: undefined,
    })
  })

  it('stores campaign progress without mutating learning storage keys', async () => {
    window.localStorage.setItem('learning_progress_snapshot', JSON.stringify({ sentinel: true }))

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    act(() => {
      result.current.setChallengeStatus('invata-ce-este-buget-public-local', 'in_progress')
    })

    const campaignSnapshot = window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY)
    const learningSnapshot = window.localStorage.getItem('learning_progress_snapshot')

    expect(campaignSnapshot).toBeTruthy()
    expect(learningSnapshot).toBe(JSON.stringify({ sentinel: true }))
  })

  it('parses legacy snapshots without selectedEntityCui', async () => {
    window.localStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: CAMPAIGN_PROGRESS_SCHEMA_VERSION,
        campaignId: CAMPAIGN_ID,
        onboardingCompletedAt: null,
        selectedLocality: null,
        challenges: {},
        lastUpdated: new Date().toISOString(),
      }),
    )

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.progress.selectedEntityCui).toBeNull()
  })

  it('persists selectedEntityCui when selecting an entity', async () => {
    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    act(() => {
      result.current.setSelectedEntity({ entityCui: '12345678' })
    })

    expect(result.current.progress.selectedEntityCui).toBe('12345678')

    const rawSnapshot = window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY)
    expect(rawSnapshot).toBeTruthy()

    const parsedSnapshot = JSON.parse(rawSnapshot ?? '{}') as { selectedEntityCui?: string | null }
    expect(parsedSnapshot.selectedEntityCui).toBe('12345678')
  })

  it('persists activeChallengeModuleSlug when selecting a module', async () => {
    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    act(() => {
      result.current.setActiveChallengeModule({ moduleSlug: 'compare-budgets' })
    })

    expect(result.current.progress.activeChallengeModuleSlug).toBe('compare-budgets')

    const rawSnapshot = window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY)
    expect(rawSnapshot).toBeTruthy()

    const parsedSnapshot = JSON.parse(rawSnapshot ?? '{}') as {
      activeChallengeModuleSlug?: string | null
    }
    expect(parsedSnapshot.activeChallengeModuleSlug).toBe('compare-budgets')
  })

  it('keeps the newer local active challenge module when sync resolves older remote data', async () => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    window.localStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify(
        createSnapshot({
          activeChallengeModuleSlug: 'compare-budgets',
          lastUpdated: '2026-01-02T00:00:00.000Z',
        }),
      ),
    )

    fetchCampaignProgressMock.mockResolvedValue({
      snapshot: createSnapshot({
        activeChallengeModuleSlug: 'budget-basics',
        lastUpdated: '2026-01-01T00:00:00.000Z',
      }),
      cursor: undefined,
    })

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isInitialResolutionReady).toBe(true)
    })

    expect(result.current.progress.activeChallengeModuleSlug).toBe('compare-budgets')
    expect(syncCampaignProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({
          activeChallengeModuleSlug: 'compare-budgets',
        }),
      }),
    )
  })

  it('keeps initial resolution pending for signed-in users until sync resolves', async () => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    let resolveFetchCampaignProgress!: (value: {
      snapshot: CampaignProgressSnapshot
      cursor: undefined
    }) => void

    fetchCampaignProgressMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetchCampaignProgress = resolve
        }),
    )

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.isInitialResolutionReady).toBe(false)

    expect(resolveFetchCampaignProgress).toBeTypeOf('function')

    resolveFetchCampaignProgress({
      snapshot: createSnapshot({
        activeChallengeModuleSlug: 'compare-budgets',
      }),
      cursor: undefined,
    })

    await waitFor(() => {
      expect(result.current.isInitialResolutionReady).toBe(true)
    })
  })

  it('keeps local campaign state ready while auth is still loading', async () => {
    authState = {
      isLoaded: false,
      isSignedIn: false,
      user: null,
    }

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.isInitialResolutionReady).toBe(true)
  })
})
