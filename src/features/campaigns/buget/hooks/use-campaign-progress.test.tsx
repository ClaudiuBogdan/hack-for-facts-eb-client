import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InteractiveStateRecord, LearningProgressEvent } from '@/features/learning/types'
import {
  CAMPAIGN_ID,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  CAMPAIGN_PROGRESS_SCHEMA_VERSION,
} from '../constants'
import { CampaignProgressProvider, useCampaignProgress } from './use-campaign-progress'
import {
  CAMPAIGN_ACTIVE_MODULE_RECORD_KEY,
  buildCampaignProgressRecords,
} from '../utils/progress-records'
import type { CampaignProgressSnapshot } from '../types'

let authState = {
  isLoaded: true,
  isSignedIn: false,
  user: null as null | { id: string },
}

const fetchCampaignProgressMock = vi.fn(async (_params?: unknown) => ({
  snapshot: createSnapshot(),
  recordsByKey: buildCampaignProgressRecords(createSnapshot()),
  events: [] as LearningProgressEvent[],
  cursor: '0',
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
    acceptedTermsAt: null,
    selectedLocality: null,
    selectedEntityCui: null,
    activeChallengeModuleSlug: null,
    challenges: {},
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createRemoteResponse(
  snapshotOverrides: Partial<CampaignProgressSnapshot> = {},
  overrides: {
    readonly recordsByKey?: Readonly<Record<string, InteractiveStateRecord>>
    readonly events?: LearningProgressEvent[]
    readonly cursor?: string
  } = {},
) {
  const snapshot = createSnapshot(snapshotOverrides)

  return {
    snapshot,
    recordsByKey: overrides.recordsByKey ?? buildCampaignProgressRecords(snapshot),
    events: overrides.events ?? [],
    cursor: overrides.cursor ?? '0',
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
    fetchCampaignProgressMock.mockResolvedValue(createRemoteResponse())
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
      result.current.setActiveChallengeModule({ moduleSlug: 'read-local-execution' })
    })

    expect(result.current.progress.activeChallengeModuleSlug).toBe('read-local-execution')

    const rawSnapshot = window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY)
    expect(rawSnapshot).toBeTruthy()

    const parsedSnapshot = JSON.parse(rawSnapshot ?? '{}') as {
      activeChallengeModuleSlug?: string | null
    }
    expect(parsedSnapshot.activeChallengeModuleSlug).toBe('read-local-execution')
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
          activeChallengeModuleSlug: 'read-local-execution',
          lastUpdated: '2026-01-02T00:00:00.000Z',
        }),
      ),
    )

    fetchCampaignProgressMock.mockResolvedValue({
      ...createRemoteResponse({
        activeChallengeModuleSlug: 'budget-basics',
        lastUpdated: '2026-01-01T00:00:00.000Z',
      }),
    })

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isInitialResolutionReady).toBe(true)
    })

    await act(async () => {
      await result.current.sync()
    })

    expect(result.current.progress.activeChallengeModuleSlug).toBe('read-local-execution')
    expect(syncCampaignProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            type: 'interactive.updated',
            payload: expect.objectContaining({
              record: expect.objectContaining({
                key: CAMPAIGN_ACTIVE_MODULE_RECORD_KEY,
                value: {
                  kind: 'json',
                  json: { value: { moduleSlug: 'read-local-execution' } },
                },
              }),
            }),
          }),
        ]),
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
      recordsByKey: Readonly<Record<string, InteractiveStateRecord>>
      events: readonly LearningProgressEvent[]
      cursor: string
    }) => void

    fetchCampaignProgressMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetchCampaignProgress = resolve as typeof resolveFetchCampaignProgress
        }),
    )

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.isInitialResolutionReady).toBe(false)

    expect(resolveFetchCampaignProgress).toBeTypeOf('function')

    resolveFetchCampaignProgress(createRemoteResponse({
      activeChallengeModuleSlug: 'read-local-execution',
    }))

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

  it('completes initial resolution when the remote learning-progress fetch fails', async () => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetchCampaignProgressMock.mockRejectedValue(new Error('NotFoundError'))

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    await waitFor(() => {
      expect(result.current.isInitialResolutionReady).toBe(true)
    })

    expect(result.current.remoteSelectedEntityCui).toBeNull()
    expect(consoleWarnSpy).toHaveBeenCalled()

    consoleWarnSpy.mockRestore()
  })

  it('resets campaign progress without emitting a global progress.reset event', async () => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    window.localStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify(
        createSnapshot({
          selectedEntityCui: '12345678',
          activeChallengeModuleSlug: 'read-local-execution',
          challenges: {
            'challenge-1': {
              status: 'completed',
              attempts: 2,
              updatedAt: '2026-01-02T00:00:00.000Z',
            },
          },
          lastUpdated: '2026-01-02T00:00:00.000Z',
        }),
      ),
    )

    fetchCampaignProgressMock.mockResolvedValue(createRemoteResponse())

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isInitialResolutionReady).toBe(true)
    })

    act(() => {
      result.current.resetProgress()
    })

    await act(async () => {
      await result.current.sync()
    })

    expect(result.current.progress.selectedEntityCui).toBeNull()
    expect(result.current.progress.activeChallengeModuleSlug).toBeNull()
    expect(result.current.progress.challenges).toEqual({})
    expect(syncCampaignProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({ type: 'interactive.updated' }),
        ]),
      }),
    )
    expect(
      syncCampaignProgressMock.mock.calls.flatMap(([params]) => {
        const value = params as { events?: readonly LearningProgressEvent[] }
        return (value.events ?? []).map((event) => event.type)
      }),
    ).not.toContain('progress.reset')
  })
})
