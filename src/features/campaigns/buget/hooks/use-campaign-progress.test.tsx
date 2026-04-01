import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InteractiveStateRecord, LearningProgressEvent } from '@/features/learning/types'
import {
  CAMPAIGN_ID,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
  CAMPAIGN_PROGRESS_SCHEMA_VERSION,
} from '../constants'
import { PRIMARIE_WEBSITE_LINK_INTERACTION } from '../civic-interaction-definitions'
import { CampaignProgressProvider, useCampaignProgress } from './use-campaign-progress'
import {
  CAMPAIGN_ACTIVE_MODULE_RECORD_KEY,
  CAMPAIGN_SELECTED_ENTITY_RECORD_KEY,
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

function Wrapper({ children }: { readonly children: ReactNode }) {
  return <CampaignProgressProvider>{children}</CampaignProgressProvider>
}

function getCampaignEventsStorageKey() {
  return `campaign_progress_events:${CAMPAIGN_ID}`
}

function readStoredCampaignEvents(): LearningProgressEvent[] {
  const rawEvents = window.localStorage.getItem(getCampaignEventsStorageKey())
  if (!rawEvents) {
    return []
  }

  return JSON.parse(rawEvents) as LearningProgressEvent[]
}

function isInteractiveUpdatedEvent(
  event: LearningProgressEvent,
): event is Extract<LearningProgressEvent, { readonly type: 'interactive.updated' }> {
  return event.type === 'interactive.updated'
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

    expect(readStoredCampaignEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'interactive.updated',
          payload: expect.objectContaining({
            record: expect.objectContaining({
              key: CAMPAIGN_SELECTED_ENTITY_RECORD_KEY,
            }),
            auditEvents: [
              expect.objectContaining({
                type: 'submitted',
                actor: 'user',
                recordKey: CAMPAIGN_SELECTED_ENTITY_RECORD_KEY,
                value: {
                  kind: 'json',
                  json: { value: { entityCui: '12345678' } },
                },
              }),
            ],
          }),
        }),
      ]),
    )
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

    expect(readStoredCampaignEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'interactive.updated',
          payload: expect.objectContaining({
            record: expect.objectContaining({
              key: CAMPAIGN_ACTIVE_MODULE_RECORD_KEY,
            }),
            auditEvents: [
              expect.objectContaining({
                type: 'submitted',
                actor: 'user',
                recordKey: CAMPAIGN_ACTIVE_MODULE_RECORD_KEY,
                value: {
                  kind: 'json',
                  json: { value: { moduleSlug: 'read-local-execution' } },
                },
              }),
            ],
          }),
        }),
      ]),
    )
  })

  it('persists per-entity accepted terms with an audit event', async () => {
    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    act(() => {
      result.current.acceptEntityTerms('12345678')
    })

    expect(result.current.progress.acceptedTermsByEntity['12345678']).toEqual(expect.any(String))
    expect(readStoredCampaignEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'interactive.updated',
          payload: expect.objectContaining({
            record: expect.objectContaining({
              key: `system:campaign:buget:accepted-terms:entity:12345678`,
            }),
          }),
        }),
      ]),
    )
  })

  it('persists challenge status updates with an audit event', async () => {
    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    act(() => {
      result.current.setChallengeStatus('challenge-1', 'in_progress')
    })

    expect(result.current.progress.challenges['challenge-1']).toEqual(
      expect.objectContaining({ status: 'in_progress', attempts: 1 }),
    )
    expect(readStoredCampaignEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'interactive.updated',
          payload: expect.objectContaining({
            record: expect.objectContaining({
              key: 'system:campaign:buget:challenge:challenge-1',
            }),
            auditEvents: [
              expect.objectContaining({
                type: 'submitted',
                actor: 'user',
                recordKey: 'system:campaign:buget:challenge:challenge-1',
                value: {
                  kind: 'json',
                  json: {
                    value: {
                      challengeSlug: 'challenge-1',
                      status: 'in_progress',
                      attempts: 1,
                    },
                  },
                },
              }),
            ],
          }),
        }),
      ]),
    )
  })

  it('supports review-driven challenge status corrections without attempts or audit events', async () => {
    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    act(() => {
      result.current.setChallengeStatus('challenge-1', 'pending_review')
    })

    act(() => {
      result.current.setChallengeStatus('challenge-1', 'in_progress', {
        incrementAttempts: false,
        emitAuditEvent: false,
      })
    })

    expect(result.current.progress.challenges['challenge-1']).toEqual(
      expect.objectContaining({ status: 'in_progress', attempts: 1 }),
    )

    const reviewSyncEvent = readStoredCampaignEvents()
      .filter(isInteractiveUpdatedEvent)
      .find((event) => {
        return event.payload.record.key === 'system:campaign:buget:challenge:challenge-1'
          && event.payload.record.value?.kind === 'json'
          && event.payload.record.value.json.value.status === 'in_progress'
          && event.payload.record.value.json.value.attempts === 1
      })

    expect(reviewSyncEvent).toBeDefined()
    expect(reviewSyncEvent?.payload.auditEvents).toBeUndefined()
  })

  it('clears challenge progress when setting not_started with zero attempts', async () => {
    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    act(() => {
      result.current.setChallengeStatus('challenge-1', 'pending_review')
    })

    act(() => {
      result.current.setChallengeStatus('challenge-1', 'not_started', {
        attempts: 0,
        emitAuditEvent: false,
        incrementAttempts: false,
      })
    })

    expect(result.current.progress.challenges['challenge-1']).toBeUndefined()

    const clearedChallengeEvent = readStoredCampaignEvents()
      .filter(isInteractiveUpdatedEvent)
      .find((event) => {
        return event.payload.record.key === 'system:campaign:buget:challenge:challenge-1'
          && event.payload.record.value?.kind === 'json'
          && event.payload.record.value.json.value.status === 'not_started'
          && event.payload.record.value.json.value.attempts === 0
      })

    expect(clearedChallengeEvent).toBeDefined()
    expect(clearedChallengeEvent?.payload.auditEvents).toBeUndefined()
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

    const migratedActiveModuleEvent = syncCampaignProgressMock.mock.calls
      .flatMap(([params]) => {
        const value = params as { events?: readonly LearningProgressEvent[] }
        return (value.events ?? []).filter(isInteractiveUpdatedEvent)
      })
      .find((event) => {
        return event.payload.record.key === CAMPAIGN_ACTIVE_MODULE_RECORD_KEY
          && event.payload.record.value?.kind === 'json'
          && event.payload.record.value.json.value.moduleSlug === 'read-local-execution'
      })

    expect(migratedActiveModuleEvent).toBeDefined()
    expect(migratedActiveModuleEvent?.payload.auditEvents).toBeUndefined()
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

  it('does not synthesize audit events for bootstrap migrations after a fetch failure', async () => {
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

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetchCampaignProgressMock
      .mockRejectedValueOnce(new Error('NotFoundError'))
      .mockResolvedValue(createRemoteResponse())

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isInitialResolutionReady).toBe(true)
    })

    await act(async () => {
      await result.current.sync()
    })

    const migratedActiveModuleEvent = syncCampaignProgressMock.mock.calls
      .flatMap(([params]) => {
        const value = params as { events?: readonly LearningProgressEvent[] }
        return (value.events ?? []).filter(isInteractiveUpdatedEvent)
      })
      .find((event) => {
        return event.payload.record.key === CAMPAIGN_ACTIVE_MODULE_RECORD_KEY
          && event.payload.record.value?.kind === 'json'
          && event.payload.record.value.json.value.moduleSlug === 'read-local-execution'
      })

    expect(migratedActiveModuleEvent).toBeDefined()
    expect(migratedActiveModuleEvent?.payload.auditEvents).toBeUndefined()

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

    const syncedInteractiveEvents = syncCampaignProgressMock.mock.calls.flatMap(([params]) => {
      const value = params as { events?: readonly LearningProgressEvent[] }
      return (value.events ?? []).filter(isInteractiveUpdatedEvent)
    })
    const clearedSelectedEntityEvent = syncedInteractiveEvents.find((event) => {
      return event.payload.record.key === CAMPAIGN_SELECTED_ENTITY_RECORD_KEY
        && event.payload.record.value?.kind === 'json'
        && event.payload.record.value.json.value.entityCui === null
    })
    const clearedActiveModuleEvent = syncedInteractiveEvents.find((event) => {
      return event.payload.record.key === CAMPAIGN_ACTIVE_MODULE_RECORD_KEY
        && event.payload.record.value?.kind === 'json'
        && event.payload.record.value.json.value.moduleSlug === null
    })
    const resetChallengeEvent = syncedInteractiveEvents.find((event) => {
      return event.payload.record.key === 'system:campaign:buget:challenge:challenge-1'
        && event.payload.record.value?.kind === 'json'
        && event.payload.record.value.json.value.status === 'not_started'
        && event.payload.record.value.json.value.attempts === 0
    })

    expect(clearedSelectedEntityEvent).toBeDefined()
    expect(clearedSelectedEntityEvent?.payload.auditEvents).toBeUndefined()
    expect(clearedActiveModuleEvent).toBeDefined()
    expect(clearedActiveModuleEvent?.payload.auditEvents).toBeUndefined()
    expect(resetChallengeEvent).toBeDefined()
    expect(resetChallengeEvent?.payload.auditEvents).toBeUndefined()
  })

  it('keeps reset challenge progress cleared when bootstrap merges older remote interaction records', async () => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    fetchCampaignProgressMock.mockResolvedValue(createRemoteResponse(
      {
        challenges: {
          'civic-monitor-and-request': {
            status: 'pending_review',
            attempts: 1,
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
      {
        recordsByKey: {
          ...buildCampaignProgressRecords(createSnapshot({
            challenges: {
              'civic-monitor-and-request': {
                status: 'pending_review',
                attempts: 1,
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            },
          })),
          'campaign:primarie-website-url::entity:4305857': {
            key: 'campaign:primarie-website-url::entity:4305857',
            interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
            lessonId: PRIMARIE_WEBSITE_LINK_INTERACTION.ownerChallengeSlug,
            kind: 'custom',
            scope: { type: 'entity', entityCui: '4305857' },
            completionRule: { type: 'resolved' },
            phase: 'pending',
            value: {
              kind: 'json',
              json: { value: { websiteUrl: 'https://sibiu.ro' } },
            },
            result: null,
            updatedAt: '2026-01-01T00:00:00.000Z',
            submittedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    ))

    const firstRender = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(firstRender.result.current.isInitialResolutionReady).toBe(true)
    })

    expect(firstRender.result.current.progress.challenges['civic-monitor-and-request']).toEqual({
      status: 'pending_review',
      attempts: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    act(() => {
      firstRender.result.current.resetProgress()
    })

    expect(firstRender.result.current.progress.challenges).toEqual({})

    firstRender.unmount()

    const secondRender = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(secondRender.result.current.isInitialResolutionReady).toBe(true)
    })

    expect(secondRender.result.current.progress.challenges).toEqual({})
  })

  it('projects approved remote review outcomes into challenge progress during sync', async () => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    fetchCampaignProgressMock.mockResolvedValue(createRemoteResponse(
      {
        challenges: {
          'civic-monitor-and-request': {
            status: 'pending_review',
            attempts: 1,
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
      {
        recordsByKey: {
          ...buildCampaignProgressRecords(createSnapshot({
            challenges: {
              'civic-monitor-and-request': {
                status: 'pending_review',
                attempts: 1,
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            },
          })),
          'campaign:primarie-website-url::entity:4305857': {
            key: 'campaign:primarie-website-url::entity:4305857',
            interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
            lessonId: PRIMARIE_WEBSITE_LINK_INTERACTION.ownerChallengeSlug,
            kind: 'custom',
            scope: { type: 'entity', entityCui: '4305857' },
            completionRule: { type: 'resolved' },
            phase: 'resolved',
            value: {
              kind: 'json',
              json: { value: { websiteUrl: 'https://sibiu.ro' } },
            },
            result: null,
            review: {
              status: 'approved',
              reviewedAt: '2026-01-02T00:00:00.000Z',
            },
            updatedAt: '2026-01-02T00:00:00.000Z',
            submittedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    ))

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isInitialResolutionReady).toBe(true)
    })

    expect(result.current.progress.challenges['civic-monitor-and-request']).toEqual({
      status: 'completed',
      attempts: 1,
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
  })

  it('refreshes remote review outcomes when the window regains focus', async () => {
    authState = {
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    fetchCampaignProgressMock
      .mockResolvedValueOnce(createRemoteResponse({
        challenges: {
          'civic-monitor-and-request': {
            status: 'pending_review',
            attempts: 1,
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      }))
      .mockResolvedValueOnce(createRemoteResponse(
        {
          challenges: {
            'civic-monitor-and-request': {
              status: 'pending_review',
              attempts: 1,
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        },
        {
          recordsByKey: {
            ...buildCampaignProgressRecords(createSnapshot({
              challenges: {
                'civic-monitor-and-request': {
                  status: 'pending_review',
                  attempts: 1,
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              },
            })),
            'campaign:primarie-website-url::entity:4305857': {
              key: 'campaign:primarie-website-url::entity:4305857',
              interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
              lessonId: PRIMARIE_WEBSITE_LINK_INTERACTION.ownerChallengeSlug,
              kind: 'custom',
              scope: { type: 'entity', entityCui: '4305857' },
              completionRule: { type: 'resolved' },
              phase: 'resolved',
              value: {
                kind: 'json',
                json: { value: { websiteUrl: 'https://sibiu.ro' } },
              },
              result: null,
              review: {
                status: 'approved',
                reviewedAt: '2026-01-02T00:00:00.000Z',
              },
              updatedAt: '2026-01-02T00:00:00.000Z',
              submittedAt: '2026-01-01T00:00:00.000Z',
            },
          },
          events: [
            {
              eventId: 'server-review-1',
              clientId: 'server',
              occurredAt: '2026-01-02T00:00:00.000Z',
              type: 'interactive.updated',
              payload: {
                record: {
                  key: 'campaign:primarie-website-url::entity:4305857',
                  interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
                  lessonId: PRIMARIE_WEBSITE_LINK_INTERACTION.ownerChallengeSlug,
                  kind: 'custom',
                  scope: { type: 'entity', entityCui: '4305857' },
                  completionRule: { type: 'resolved' },
                  phase: 'resolved',
                  value: {
                    kind: 'json',
                    json: { value: { websiteUrl: 'https://sibiu.ro' } },
                  },
                  result: null,
                  review: {
                    status: 'approved',
                    reviewedAt: '2026-01-02T00:00:00.000Z',
                  },
                  updatedAt: '2026-01-02T00:00:00.000Z',
                  submittedAt: '2026-01-01T00:00:00.000Z',
                },
              },
            },
          ],
        },
      ))

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isInitialResolutionReady).toBe(true)
    })

    expect(result.current.progress.challenges['civic-monitor-and-request']).toEqual({
      status: 'pending_review',
      attempts: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => {
      expect(result.current.progress.challenges['civic-monitor-and-request']).toEqual({
        status: 'completed',
        attempts: 1,
        updatedAt: '2026-01-02T00:00:00.000Z',
      })
    })
  })
})
