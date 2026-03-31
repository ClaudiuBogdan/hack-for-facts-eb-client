import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@/test/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { LearningProgressProvider, useLearningProgress } from './use-learning-progress'
import {
  createLearningActivePathRecord,
  createLearningOnboardingRecord,
  createLearningStreakRecord,
  createLessonProgressRecord,
} from '../utils/progress-projection'
import type {
  InteractiveStateRecord,
  LearningGuestProgress,
  LearningProgressEvent,
  LearningProgressRemoteSnapshot,
} from '../types'

const {
  authState,
  captureExceptionMock,
  fetchLearningProgressMock,
  syncLearningProgressEventsMock,
  toast,
  UnsupportedLearningProgressSnapshotVersionError,
} = vi.hoisted(() => {
  class UnsupportedLearningProgressSnapshotVersionError extends Error {
    constructor() {
      super('Unsupported learning progress snapshot version returned by the server.')
      this.name = 'UnsupportedLearningProgressSnapshotVersionError'
    }
  }

  return {
    authState: {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: false,
      user: null as null | { id: string },
    },
    captureExceptionMock: vi.fn(),
    fetchLearningProgressMock: vi.fn(),
    syncLearningProgressEventsMock: vi.fn(),
    toast: {
      info: vi.fn(),
      warning: vi.fn(),
    },
    UnsupportedLearningProgressSnapshotVersionError,
  }
})

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  },
}))

vi.mock('@sentry/react', () => ({
  captureException: (error: unknown, context?: unknown) => captureExceptionMock(error, context),
}))

vi.mock('sonner', () => ({
  toast,
}))

vi.mock('../api/progress', () => ({
  fetchLearningProgress: (params: unknown) => fetchLearningProgressMock(params),
  syncLearningProgressEvents: (params: unknown) => syncLearningProgressEventsMock(params),
  UnsupportedLearningProgressSnapshotVersionError,
}))

const GUEST_EVENTS_KEY = 'learning_progress_events'
const GUEST_SNAPSHOT_KEY = 'learning_progress_snapshot'

function getAuthEventsKey(userId: string): string {
  return `learning_progress_events:${userId}`
}

function getAuthSnapshotKey(userId: string): string {
  return `learning_progress_snapshot:${userId}`
}

function getAuthSyncKey(userId: string): string {
  return `learning_progress_sync:${userId}`
}

function buildProgress(overrides: Partial<LearningGuestProgress> = {}): LearningGuestProgress {
  const progress: LearningGuestProgress = {
    version: 1,
    onboarding: { pathId: null, relatedPaths: [], completedAt: null },
    activePathId: null,
    content: {},
    interactiveState: { recordsByKey: {}, eventLogByRecordKey: {} },
    streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
    lastUpdated: '2026-03-31T10:00:00.000Z',
    ...overrides,
  }

  const projectedSystemRecords: Record<string, InteractiveStateRecord> = {}

  if (progress.onboarding.pathId !== null || progress.onboarding.completedAt !== null) {
    const onboardingUpdatedAt = progress.onboarding.completedAt ?? progress.lastUpdated
    projectedSystemRecords['system:learning-onboarding'] = createLearningOnboardingRecord({
      pathId: progress.onboarding.pathId,
      relatedPaths: progress.onboarding.relatedPaths,
      completedAt: progress.onboarding.completedAt,
      updatedAt: onboardingUpdatedAt,
    })
  }

  if (progress.activePathId !== null) {
    projectedSystemRecords['system:learning-active-path'] = createLearningActivePathRecord({
      pathId: progress.activePathId,
      updatedAt: progress.lastUpdated,
    })
  }

  if (
    progress.streak.currentStreak > 0
    || progress.streak.longestStreak > 0
    || progress.streak.lastActivityDate !== null
  ) {
    projectedSystemRecords['system:learning-streak'] = createLearningStreakRecord({
      streak: progress.streak,
      updatedAt: progress.lastUpdated,
    })
  }

  for (const lessonProgress of Object.values(progress.content)) {
    if (!lessonProgress) continue
    projectedSystemRecords[`system:lesson-progress:${lessonProgress.contentId}`] = createLessonProgressRecord({
      progress: lessonProgress,
      updatedAt: lessonProgress.lastAttemptAt,
    })
  }

  return {
    ...progress,
    interactiveState: {
      recordsByKey: {
        ...projectedSystemRecords,
        ...progress.interactiveState.recordsByKey,
      },
      eventLogByRecordKey: progress.interactiveState.eventLogByRecordKey,
    },
  }
}

function createInteractiveRecord(overrides: Partial<InteractiveStateRecord> & {
  readonly key: string
  readonly interactionId: string
  readonly lessonId: string
  readonly kind: InteractiveStateRecord['kind']
}): InteractiveStateRecord {
  return {
    key: overrides.key,
    interactionId: overrides.interactionId,
    lessonId: overrides.lessonId,
    kind: overrides.kind,
    scope: overrides.scope ?? { type: 'global' },
    completionRule: overrides.completionRule ?? { type: 'resolved' },
    phase: overrides.phase ?? 'resolved',
    value: overrides.value ?? {
      kind: 'json',
      json: { value: { value: overrides.interactionId } },
    },
    result: overrides.result ?? null,
    ...(overrides.review !== undefined ? { review: overrides.review } : {}),
    updatedAt: overrides.updatedAt ?? '2026-03-31T10:00:00.000Z',
    submittedAt: overrides.submittedAt ?? null,
    ...(overrides.sourceUrl !== undefined ? { sourceUrl: overrides.sourceUrl } : {}),
  }
}

function createInteractiveUpdatedEvent(params: {
  readonly eventId: string
  readonly record: InteractiveStateRecord
}): LearningProgressEvent {
  return {
    eventId: params.eventId,
    occurredAt: params.record.updatedAt,
    clientId: 'test-client',
    type: 'interactive.updated',
    payload: {
      record: params.record,
    },
  }
}

function createRemoteResponse(overrides: {
  readonly snapshot?: LearningProgressRemoteSnapshot
  readonly events?: LearningProgressEvent[]
  readonly cursor?: string
} = {}) {
  return {
    snapshot: overrides.snapshot ?? {
      version: 1 as const,
      recordsByKey: {},
      lastUpdated: null,
    },
    events: overrides.events ?? [],
    cursor: overrides.cursor ?? '0',
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return {
    queryClient,
    wrapper: ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <LearningProgressProvider>{children}</LearningProgressProvider>
      </QueryClientProvider>
    ),
  }
}

function readStoredEvents(key: string): LearningProgressEvent[] {
  const raw = window.localStorage.getItem(key)
  return raw ? (JSON.parse(raw) as LearningProgressEvent[]) : []
}

function readStoredSyncState(key: string): {
  readonly events: Record<string, { status: string; retryCount: number; errorMessage?: string }>
} {
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    throw new Error(`Expected sync state for key "${key}"`)
  }
  return JSON.parse(raw) as {
    readonly events: Record<string, { status: string; retryCount: number; errorMessage?: string }>
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

describe('use-learning-progress auth sync behavior', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/ro/learning/path-a/module-a/lesson-1')
    authState.isEnabled = true
    authState.isLoaded = true
    authState.isSignedIn = false
    authState.user = null
    fetchLearningProgressMock.mockReset()
    syncLearningProgressEventsMock.mockReset()
    captureExceptionMock.mockReset()
    toast.info.mockReset()
    toast.warning.mockReset()
    fetchLearningProgressMock.mockResolvedValue(createRemoteResponse())
    syncLearningProgressEventsMock.mockResolvedValue({
      ok: true,
      data: {
        newEventsCount: 0,
        failedEvents: [],
      },
    })
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.useRealTimers()
  })

  it('chunks 101 pending auth events into sequential sync requests', async () => {
    authState.isEnabled = true
    authState.isLoaded = true
    authState.isSignedIn = true
    authState.user = { id: 'user-1' }

    const events = Array.from({ length: 101 }, (_, index) => {
      const iso = new Date(Date.UTC(2026, 2, 31, 10, 0, index)).toISOString()
      return createInteractiveUpdatedEvent({
        eventId: `event-${index}`,
        record: createInteractiveRecord({
          key: `quiz-${index}::global`,
          interactionId: `quiz-${index}`,
          lessonId: `lesson-${index}`,
          kind: 'quiz',
          completionRule: { type: 'outcome', outcome: 'correct' },
          updatedAt: iso,
          result: {
            outcome: 'correct',
            evaluatedAt: iso,
          },
          submittedAt: iso,
        }),
      })
    })

    window.localStorage.setItem(getAuthSnapshotKey('user-1'), JSON.stringify(buildProgress()))
    window.localStorage.setItem(getAuthEventsKey('user-1'), JSON.stringify(events))

    syncLearningProgressEventsMock
      .mockResolvedValueOnce({
        ok: true,
        data: { newEventsCount: 100, failedEvents: [] },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { newEventsCount: 1, failedEvents: [] },
      })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLearningProgress(), { wrapper })

    await waitFor(() => {
      expect(result.current.bootstrapPhase).toBe('ready')
    })

    syncLearningProgressEventsMock.mockClear()

    await act(async () => {
      await result.current.sync()
    })

    expect(syncLearningProgressEventsMock).toHaveBeenCalledTimes(2)
    expect(syncLearningProgressEventsMock.mock.calls[0]?.[0].events).toHaveLength(100)
    expect(syncLearningProgressEventsMock.mock.calls[1]?.[0].events).toHaveLength(1)
    expect(readStoredEvents(getAuthEventsKey('user-1'))).toEqual([])
  })

  it('quarantines failed ids from a partial-success chunk and removes applied ids immediately', async () => {
    authState.isEnabled = true
    authState.isLoaded = true
    authState.isSignedIn = true
    authState.user = { id: 'user-1' }

    const events = ['one', 'two', 'three'].map((suffix, index) => {
      const iso = `2026-03-31T10:0${index}:00.000Z`
      return createInteractiveUpdatedEvent({
        eventId: `event-${suffix}`,
        record: createInteractiveRecord({
          key: `quiz-${suffix}::global`,
          interactionId: `quiz-${suffix}`,
          lessonId: `lesson-${suffix}`,
          kind: 'quiz',
          completionRule: { type: 'outcome', outcome: 'correct' },
          updatedAt: iso,
          result: {
            outcome: 'correct',
            evaluatedAt: iso,
          },
          submittedAt: iso,
        }),
      })
    })

    window.localStorage.setItem(getAuthSnapshotKey('user-1'), JSON.stringify(buildProgress()))
    window.localStorage.setItem(getAuthEventsKey('user-1'), JSON.stringify(events))

    syncLearningProgressEventsMock.mockResolvedValueOnce({
      ok: true,
      data: {
        newEventsCount: 2,
        failedEvents: [
          {
            eventId: 'event-two',
            errorType: 'InvalidEventError',
            message: 'Invalid event payload.',
          },
        ],
      },
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLearningProgress(), { wrapper })

    await waitFor(() => {
      expect(result.current.bootstrapPhase).toBe('ready')
    })

    syncLearningProgressEventsMock.mockClear()

    await act(async () => {
      await result.current.sync()
    })

    expect(readStoredEvents(getAuthEventsKey('user-1'))).toEqual([])
    const syncState = readStoredSyncState(getAuthSyncKey('user-1'))
    expect(syncState.events['event-one']).toBeUndefined()
    expect(syncState.events['event-three']).toBeUndefined()
    expect(syncState.events['event-two']).toEqual(
      expect.objectContaining({
        status: 'quarantined',
        retryCount: 5,
        errorMessage: 'Invalid event payload.',
      }),
    )
  })

  it('keeps retryable failures queued and retries them after the backoff delay', async () => {
    authState.isEnabled = true
    authState.isLoaded = true
    authState.isSignedIn = true
    authState.user = { id: 'user-1' }

    const event = createInteractiveUpdatedEvent({
      eventId: 'event-retry',
      record: createInteractiveRecord({
        key: 'quiz-retry::global',
        interactionId: 'quiz-retry',
        lessonId: 'lesson-retry',
        kind: 'quiz',
        completionRule: { type: 'outcome', outcome: 'correct' },
        updatedAt: '2026-03-31T10:00:00.000Z',
        result: {
          outcome: 'correct',
          evaluatedAt: '2026-03-31T10:00:00.000Z',
        },
        submittedAt: '2026-03-31T10:00:00.000Z',
      }),
    })

    window.localStorage.setItem(getAuthSnapshotKey('user-1'), JSON.stringify(buildProgress()))
    window.localStorage.setItem(getAuthEventsKey('user-1'), JSON.stringify([event]))

    syncLearningProgressEventsMock.mockResolvedValue({
      ok: false,
      error: {
        status: 500,
        errorType: 'DatabaseError',
        message: 'Database unavailable',
        retryable: true,
      },
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLearningProgress(), { wrapper })

    await waitFor(() => {
      expect(result.current.bootstrapPhase).toBe('ready')
    })

    vi.useFakeTimers()
    syncLearningProgressEventsMock.mockClear()

    await act(async () => {
      await result.current.sync()
    })

    expect(readStoredEvents(getAuthEventsKey('user-1'))).toHaveLength(1)
    expect(readStoredSyncState(getAuthSyncKey('user-1')).events['event-retry']).toEqual(
      expect.objectContaining({
        status: 'error',
        retryCount: 1,
        errorMessage: 'Database unavailable',
      }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(syncLearningProgressEventsMock).toHaveBeenCalledTimes(2)
  })

  it('reloads sync state from storage updates before deciding what to resend', async () => {
    authState.isEnabled = true
    authState.isLoaded = true
    authState.isSignedIn = true
    authState.user = { id: 'user-1' }

    const event = createInteractiveUpdatedEvent({
      eventId: 'event-cross-tab',
      record: createInteractiveRecord({
        key: 'quiz-cross-tab::global',
        interactionId: 'quiz-cross-tab',
        lessonId: 'lesson-cross-tab',
        kind: 'quiz',
        completionRule: { type: 'outcome', outcome: 'correct' },
        updatedAt: '2026-03-31T10:00:00.000Z',
        result: {
          outcome: 'correct',
          evaluatedAt: '2026-03-31T10:00:00.000Z',
        },
        submittedAt: '2026-03-31T10:00:00.000Z',
      }),
    })

    window.localStorage.setItem(getAuthSnapshotKey('user-1'), JSON.stringify(buildProgress()))
    window.localStorage.setItem(getAuthEventsKey('user-1'), JSON.stringify([event]))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLearningProgress(), { wrapper })

    await waitFor(() => {
      expect(result.current.bootstrapPhase).toBe('ready')
    })

    window.localStorage.setItem(getAuthSyncKey('user-1'), JSON.stringify({
      version: 1,
      events: {
        'event-cross-tab': {
          status: 'quarantined',
          lastAttemptAt: '2026-03-31T10:01:00.000Z',
          lastSyncedAt: null,
          retryCount: 5,
          errorMessage: 'Already quarantined in another tab.',
        },
      },
      lastSuccessfulSyncAt: null,
      lastSyncedCursor: '0',
    }))

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: getAuthSyncKey('user-1') }))
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 150)
      })
    })

    syncLearningProgressEventsMock.mockClear()

    await act(async () => {
      await result.current.sync()
    })

    expect(syncLearningProgressEventsMock).not.toHaveBeenCalled()
  })

  it('hydrates local authenticated state before the remote bootstrap fetch resolves', async () => {
    authState.isEnabled = true
    authState.isLoaded = true
    authState.isSignedIn = true
    authState.user = { id: 'user-1' }

    const localSnapshot = buildProgress({
      content: {
        'lesson-1': {
          contentId: 'lesson-1',
          status: 'completed',
          score: 100,
          lastAttemptAt: '2026-03-31T10:00:00.000Z',
          completedAt: '2026-03-31T10:00:00.000Z',
          contentVersion: 'v1',
        },
      },
    })
    const pendingFetch = deferred<ReturnType<typeof createRemoteResponse>>()

    fetchLearningProgressMock.mockReturnValueOnce(pendingFetch.promise)
    window.localStorage.setItem(getAuthSnapshotKey('user-1'), JSON.stringify(localSnapshot))
    window.localStorage.setItem(getAuthEventsKey('user-1'), JSON.stringify([]))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLearningProgress(), { wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
      expect(result.current.bootstrapPhase).toBe('loading')
      expect(result.current.progress.content['lesson-1']?.status).toBe('completed')
    })

    await act(async () => {
      pendingFetch.resolve(createRemoteResponse())
      await pendingFetch.promise
    })

    await waitFor(() => {
      expect(result.current.bootstrapPhase).toBe('ready')
    })
  })

  it('treats unsupported snapshot versions as bootstrap failures without wiping local state', async () => {
    authState.isEnabled = true
    authState.isLoaded = true
    authState.isSignedIn = true
    authState.user = { id: 'user-1' }

    const localSnapshot = buildProgress({
      activePathId: 'budget-basics',
    })

    fetchLearningProgressMock.mockRejectedValue(new UnsupportedLearningProgressSnapshotVersionError())
    window.localStorage.setItem(getAuthSnapshotKey('user-1'), JSON.stringify(localSnapshot))
    window.localStorage.setItem(getAuthEventsKey('user-1'), JSON.stringify([]))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLearningProgress(), { wrapper })

    await waitFor(() => {
      expect(result.current.bootstrapPhase).toBe('failed')
      expect(result.current.progress.activePathId).toBe('budget-basics')
    })

    expect(toast.info).toHaveBeenCalledWith('Syncing your progress...')
    expect(toast.warning).toHaveBeenCalledWith('Could not sync with server. Your progress is saved locally.')
  })

  it('backs up corrupted local storage and warns once per session', async () => {
    authState.isEnabled = true
    authState.isLoaded = true
    authState.isSignedIn = false
    authState.user = null

    window.localStorage.setItem(GUEST_SNAPSHOT_KEY, '{not-json')

    const { wrapper } = createWrapper()
    renderHook(() => useLearningProgress(), { wrapper })

    await waitFor(() => {
      const backupKeys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
        .filter((key): key is string => key !== null && key.startsWith('learning_progress_snapshot__corrupted__'))
      expect(backupKeys.length).toBe(1)
    })

    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    expect(toast.warning).toHaveBeenCalledWith('Some saved local data was corrupted and has been reset.')
  })

  it('compacts oversized guest queues down to the current state shape', async () => {
    authState.isEnabled = true
    authState.isLoaded = true
    authState.isSignedIn = false
    authState.user = null

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLearningProgress(), { wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
      expect(result.current.bootstrapPhase).toBe('ready')
    })

    for (let index = 0; index < 101; index += 1) {
      await act(async () => {
        await result.current.saveInteractiveDraft({
          definition: {
            id: 'guest-compact',
            lessonId: 'lesson-compact',
            kind: 'custom',
            scopePolicy: 'global',
            completionRule: { type: 'resolved' },
          },
          value: {
            kind: 'json',
            json: {
              value: {
                counter: index,
              },
            },
          },
        })
      })
    }

    const storedEvents = readStoredEvents(GUEST_EVENTS_KEY)
    expect(storedEvents).toHaveLength(1)
    expect(storedEvents[0]).toMatchObject({
      type: 'interactive.updated',
      payload: {
        record: expect.objectContaining({
          key: 'guest-compact::global',
        }),
      },
    })
  })
})
