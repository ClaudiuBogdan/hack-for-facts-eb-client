import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InteractiveStateRecord, LearningProgressEvent } from '@/features/learning/types'
import {
  CAMPAIGN_ID,
  CAMPAIGN_PROGRESS_EVENTS_STORAGE_KEY,
  CAMPAIGN_PROGRESS_SCHEMA_VERSION,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
} from '../constants'
import type { CampaignProgressSnapshot } from '../types'
import { buildCampaignProgressRecords } from '../utils/progress-records'
import { CampaignProgressProvider } from './use-campaign-progress'
import { useCampaignRegistration } from './use-campaign-registration'

type MockAuthState = {
  isEnabled: boolean
  isLoaded: boolean
  isSignedIn: boolean
  user: { id: string } | null
}

let authState: MockAuthState = {
  isEnabled: true,
  isLoaded: true,
  isSignedIn: false,
  user: null,
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
    acceptedTermsByEntity: {},
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

function getAuthSnapshotStorageKey(userId: string): string {
  return `${CAMPAIGN_PROGRESS_STORAGE_KEY}:${userId}`
}

function getAuthEventsStorageKey(userId: string): string {
  return `${CAMPAIGN_PROGRESS_EVENTS_STORAGE_KEY}:${userId}`
}

function Wrapper({ children }: { readonly children: ReactNode }) {
  return <CampaignProgressProvider>{children}</CampaignProgressProvider>
}

describe('useCampaignRegistration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: false,
      user: null,
    }
    fetchCampaignProgressMock.mockClear()
    syncCampaignProgressMock.mockClear()
    fetchCampaignProgressMock.mockResolvedValue(createRemoteResponse())
  })

  it('reports ready for signed-out users without accepting terms', async () => {
    const { result } = renderHook(() => useCampaignRegistration(null), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.isRegistered).toBe(false)
  })

  it('persists accepted terms in unified campaign progress for the current signed-in user', async () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    const { result, rerender } = renderHook(() => useCampaignRegistration('12345678'), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.isRegistered).toBe(false)

    await act(async () => {
      await result.current.register()
    })

    expect(result.current.isRegistered).toBe(true)
    expect(result.current.registeredAt).toEqual(expect.any(String))

    const storedSnapshot = window.localStorage.getItem(getAuthSnapshotStorageKey('user-1'))
    expect(storedSnapshot).toBeTruthy()
    expect(JSON.parse(storedSnapshot ?? '{}')).toEqual(
      expect.objectContaining({
        acceptedTermsByEntity: expect.objectContaining({
          '12345678': expect.any(String),
        }),
      }),
    )

    rerender()
    expect(result.current.isRegistered).toBe(true)
  })

  it('does not create accepted terms on passive signed-in load', async () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    const { result } = renderHook(() => useCampaignRegistration(null), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.isRegistered).toBe(false)

    const storedSnapshot = window.localStorage.getItem(getAuthSnapshotStorageKey('user-1'))
    expect(storedSnapshot).toBeTruthy()
    expect(JSON.parse(storedSnapshot ?? '{}')).toEqual(
      expect.objectContaining({
        acceptedTermsByEntity: {},
      }),
    )
    expect(window.localStorage.getItem(getAuthEventsStorageKey('user-1'))).toBe(JSON.stringify([]))
  })

  it('guards against duplicate same-tick registration calls', async () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    const { result } = renderHook(() => useCampaignRegistration('12345678'), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    await act(async () => {
      await Promise.all([
        result.current.register(),
        result.current.register(),
      ])
    })

    const storedEvents = JSON.parse(
      window.localStorage.getItem(getAuthEventsStorageKey('user-1')) ?? '[]',
    ) as Array<{
      readonly type?: string
      readonly payload?: {
        readonly record?: {
          readonly key?: string
        }
      }
    }>

    const acceptedTermsEvents = storedEvents.filter((event) =>
      event.type === 'interactive.updated'
      && event.payload?.record?.key === 'funky:progress:terms_accepted::entity:12345678'
    )

    expect(acceptedTermsEvents).toHaveLength(1)
  })
})
