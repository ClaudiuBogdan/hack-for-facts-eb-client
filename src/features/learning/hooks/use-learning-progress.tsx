import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { readJsonFromLocalStorage } from '@/lib/storage/read-json-from-local-storage'
import {
  fetchLearningProgress,
  syncLearningProgressEvents,
  UnsupportedLearningProgressSnapshotVersionError,
} from '../api/progress'
import { getEmptyLearningGuestProgress, parseLearningGuestProgress } from '../schemas/progress'
import { parseLearningProgressEvents } from '../schemas/progress-events'
import { applyLearningProgressEvent, reduceLearningProgressEvents } from '../utils/progress-event-reducer'
import {
  createInteractiveStateRecord,
  getInteractiveAuditLog,
  getInteractiveRecord,
  resolveInteractionScope,
} from '../utils/interactive-state'
import {
  createLearningActivePathRecord,
  createLearningOnboardingRecord,
  createLearningStreakRecord,
  createLessonProgressRecord,
  SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY,
  SYSTEM_LEARNING_ONBOARDING_RECORD_KEY,
  SYSTEM_LEARNING_STREAK_RECORD_KEY,
  SYSTEM_LESSON_PROGRESS_RECORD_PREFIX,
  toDateString,
  upsertProjectedContentProgress,
} from '../utils/progress-projection'
import {
  mergeLearningGuestProgress,
  reconcileLearningGuestProgressWithRemote,
} from '../utils/progress-merge'
import { calculateStreakUpdate } from '../utils/streak'
import {
  LEARNING_PROGRESS_SCHEMA_VERSION,
  type InteractiveAuditEvent,
  type InteractiveDefinition,
  type InteractiveStateRecord,
  type InteractionOutcome,
  type InteractionValue,
  type LearningAuthState,
  type LearningContentProgress,
  type LearningGuestProgress,
  type LearningInteractionAction,
  type LearningProgressEvent,
} from '../types'

const GUEST_EVENTS_KEY = 'learning_progress_events'
const GUEST_SNAPSHOT_KEY = 'learning_progress_snapshot'
const CLIENT_ID_KEY = 'learning_progress_client_id'

const MAX_RETRIES = 4
const RETRY_DELAYS = [1000, 5000, 15000, 60000]
const SYNC_DEBOUNCE_MS = 1200
const REMOTE_REFRESH_INTERVAL_MS = 15000
const MAX_SYNC_EVENTS_PER_REQUEST = 100
const MAX_GUEST_PENDING_EVENTS = 100
const BOOTSTRAP_MAX_ATTEMPTS = 3
const BOOTSTRAP_RETRY_DELAY_MS = 3000
const STORAGE_PROBE_KEY = '__learning_progress_storage_probe__'

type RemoteLearningProgress = Awaited<ReturnType<typeof fetchLearningProgress>>

function getAuthEventsKey(userId: string): string {
  return `learning_progress_events:${userId}`
}

function getAuthSnapshotKey(userId: string): string {
  return `learning_progress_snapshot:${userId}`
}

function getAuthSyncKey(userId: string): string {
  return `learning_progress_sync:${userId}`
}

function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.code === 22
  }
  return false
}

function nowIso(): string {
  return new Date().toISOString()
}

function getNextTimestamp(previousTimestamp?: string | null): string {
  const currentTime = Date.now()
  const previousTime = previousTimestamp ? Date.parse(previousTimestamp) : 0
  const nextTime = Number.isFinite(previousTime)
    ? Math.max(currentTime, previousTime + 1)
    : currentTime
  return new Date(nextTime).toISOString()
}

function clampScore(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Math.max(0, Math.min(100, value))
}

function chunkArray<T>(items: readonly T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    return [Array.from(items)]
  }

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

function assertEntityScopeMutationInput(
  definition: Pick<InteractiveDefinition, 'scopePolicy'>,
  entityCui?: string | null,
): void {
  if (
    import.meta.env.DEV
    && definition.scopePolicy === 'entity'
    && (!entityCui || entityCui.trim().length === 0)
  ) {
    throw new Error(
      '[useLearningProgress] entityCui is required when scopePolicy is "entity" for mutations.',
    )
  }
}

function sanitizeSourceUrl(sourceUrl: string | undefined | null): string | undefined {
  if (typeof sourceUrl !== 'string') {
    return undefined
  }

  const trimmedSourceUrl = sourceUrl.trim()
  return trimmedSourceUrl.length > 0 ? trimmedSourceUrl : undefined
}

function withSourceUrl(
  record: InteractiveStateRecord,
  sourceUrl: string | undefined,
): InteractiveStateRecord {
  if (sourceUrl === undefined) {
    if (record.sourceUrl === undefined) {
      return record
    }

    const { sourceUrl: _sourceUrl, ...recordWithoutSourceUrl } = record
    void _sourceUrl
    return recordWithoutSourceUrl
  }

  if (record.sourceUrl === sourceUrl) {
    return record
  }

  return {
    ...record,
    sourceUrl,
  }
}

type SaveOnboardingInput = {
  readonly pathId: string
  readonly relatedPaths?: readonly string[]
}

type SaveContentProgressInput = {
  readonly contentId: string
  readonly status: LearningContentProgress['status']
  readonly score?: number
  readonly contentVersion?: string
}

type SaveInteractiveDraftInput = {
  readonly definition: InteractiveDefinition
  readonly value: InteractionValue
  readonly entityCui?: string | null
  readonly content?: SaveContentProgressInput
}

type SubmitInteractiveInput = {
  readonly definition: InteractiveDefinition
  readonly entityCui?: string | null
  readonly value?: InteractionValue
  readonly content?: SaveContentProgressInput
}

type ResolveInteractiveInput = {
  readonly definition: InteractiveDefinition
  readonly entityCui?: string | null
  readonly value?: InteractionValue
  readonly phase?: 'resolved' | 'failed'
  readonly outcome?: InteractionOutcome
  readonly score?: number | null
  readonly feedbackText?: string | null
  readonly response?: Readonly<Record<string, unknown>> | null
  readonly content?: SaveContentProgressInput
}

type ApplyInteractiveEvaluationInput = {
  readonly recordKey: string
  readonly phase?: 'resolved' | 'failed'
  readonly outcome?: InteractionOutcome
  readonly score?: number | null
  readonly feedbackText?: string | null
  readonly response?: Readonly<Record<string, unknown>> | null
  readonly content?: SaveContentProgressInput
}

type ResetInteractiveInput = {
  readonly definition: InteractiveDefinition
  readonly entityCui?: string | null
}

type LearningProgressBootstrapPhase = 'loading' | 'ready' | 'failed'

type LearningProgressContextValue = {
  readonly isReady: boolean
  readonly bootstrapPhase: LearningProgressBootstrapPhase
  readonly auth: LearningAuthState
  readonly progress: LearningGuestProgress
  readonly getContentProgress: (contentId: string) => LearningContentProgress | undefined
  readonly getInteractiveRecord: (
    definition: Pick<InteractiveDefinition, 'id' | 'scopePolicy'>,
    entityCui?: string | null,
  ) => InteractiveStateRecord | null
  readonly getInteractiveAuditLog: (recordKey: string) => readonly InteractiveAuditEvent[]
  readonly saveContentProgress: (input: SaveContentProgressInput) => Promise<void>
  readonly saveInteractiveDraft: (input: SaveInteractiveDraftInput) => Promise<InteractiveStateRecord | null>
  readonly submitInteractive: (input: SubmitInteractiveInput) => Promise<InteractiveStateRecord | null>
  readonly resolveInteractive: (input: ResolveInteractiveInput) => Promise<InteractiveStateRecord | null>
  readonly applyInteractiveEvaluation: (input: ApplyInteractiveEvaluationInput) => Promise<InteractiveStateRecord | null>
  readonly resetInteractive: (input: ResetInteractiveInput) => Promise<InteractiveStateRecord | null>
  readonly dispatchInteractionAction: (action: LearningInteractionAction) => Promise<void>
  readonly saveOnboarding: (input: SaveOnboardingInput) => Promise<void>
  readonly setActivePathId: (pathId: string | null) => Promise<void>
  readonly resetOnboarding: () => Promise<void>
  readonly sync: () => Promise<void>
  readonly clearProgress: () => void
}

const LearningProgressContext = createContext<LearningProgressContextValue | null>(null)

type LearningSyncStatus = 'synced' | 'local' | 'syncing' | 'error' | 'quarantined'

type LearningProgressSyncEntry = {
  status: LearningSyncStatus
  lastAttemptAt: string | null
  lastSyncedAt: string | null
  retryCount: number
  errorMessage?: string
}

type LearningProgressSyncState = {
  version: 1
  events: Record<string, LearningProgressSyncEntry>
  lastSuccessfulSyncAt: string | null
  lastSyncedCursor: string | null
}

function getEmptySyncState(): LearningProgressSyncState {
  return {
    version: 1,
    events: {},
    lastSuccessfulSyncAt: null,
    lastSyncedCursor: null,
  }
}

function parseSyncState(raw: unknown): LearningProgressSyncState {
  if (!raw || typeof raw !== 'object') return getEmptySyncState()
  const record = raw as Partial<LearningProgressSyncState>
  return {
    version: 1,
    events: record.events && typeof record.events === 'object' ? record.events : {},
    lastSuccessfulSyncAt: typeof record.lastSuccessfulSyncAt === 'string' ? record.lastSuccessfulSyncAt : null,
    lastSyncedCursor: typeof record.lastSyncedCursor === 'string' ? record.lastSyncedCursor : null,
  }
}

function mergeEventLogs(...logs: LearningProgressEvent[][]): LearningProgressEvent[] {
  const byId = new Map<string, LearningProgressEvent>()
  for (const log of logs) {
    for (const event of log) {
      if (!byId.has(event.eventId)) {
        byId.set(event.eventId, event)
      }
    }
  }
  return Array.from(byId.values())
}

function compareIsoInstants(leftTimestamp: string, rightTimestamp: string): number {
  const leftMilliseconds = Date.parse(leftTimestamp)
  const rightMilliseconds = Date.parse(rightTimestamp)

  if (!Number.isNaN(leftMilliseconds) && !Number.isNaN(rightMilliseconds)) {
    if (leftMilliseconds < rightMilliseconds) return -1
    if (leftMilliseconds > rightMilliseconds) return 1
    return 0
  }

  return leftTimestamp.localeCompare(rightTimestamp)
}

function createEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getAuthState(params: {
  readonly isAuthEnabled: boolean
  readonly isSignedIn: boolean
  readonly userId: string | null
}): LearningAuthState {
  const isAuthenticated = params.isAuthEnabled && params.isSignedIn && Boolean(params.userId)

  if (isAuthenticated) {
    return {
      isAuthenticated: true,
      userId: params.userId,
    }
  }

  return {
    isAuthenticated: false,
    userId: null,
  }
}

export function LearningProgressProvider({ children }: { readonly children: React.ReactNode }) {
  const { isEnabled, isLoaded, isSignedIn, user } = useAuth()

  const auth = useMemo<LearningAuthState>(() => {
    return getAuthState({
      isAuthEnabled: isEnabled,
      isSignedIn,
      userId: user?.id ?? null,
    })
  }, [isEnabled, isSignedIn, user?.id])

  const progressQueryKey = useMemo(() => ['learning-progress', auth.userId ?? 'guest'] as const, [auth.userId])

  const [progress, setProgress] = useState<LearningGuestProgress>(() => getEmptyLearningGuestProgress())
  const [isReady, setIsReady] = useState(false)
  const [bootstrapPhase, setBootstrapPhase] = useState<LearningProgressBootstrapPhase>('loading')

  const progressRef = useRef(progress)
  progressRef.current = progress

  const eventsRef = useRef<LearningProgressEvent[]>([])
  const syncStateRef = useRef<LearningProgressSyncState>(getEmptySyncState())
  const storageBlockedRef = useRef(false)
  const clientIdRef = useRef<string | null>(null)
  const syncTimeoutRef = useRef<number | null>(null)
  const retryTimeoutRef = useRef<number | null>(null)
  const syncInFlightRef = useRef(false)
  const syncNowRef = useRef<() => Promise<void>>(async () => {})
  const isBootstrappingRef = useRef(false)
  const queuedEventsRef = useRef<LearningProgressEvent[]>([])
  const pendingGuestCleanupRef = useRef(false)
  const hasShownBootstrapLoadingToastRef = useRef(false)
  const hasShownBootstrapFailedToastRef = useRef(false)

  const getClientId = useCallback((): string => {
    if (clientIdRef.current) return clientIdRef.current
    const stored = readJsonFromLocalStorage(CLIENT_ID_KEY)
    if (typeof stored === 'string' && stored.trim().length > 0) {
      clientIdRef.current = stored
      return stored
    }
    const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(16).slice(2)}`
    clientIdRef.current = generated
    if (!storageBlockedRef.current && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(CLIENT_ID_KEY, JSON.stringify(generated))
      } catch (error) {
        if (isQuotaExceededError(error)) {
          storageBlockedRef.current = true
        }
      }
    }
    return generated
  }, [])

  const getCurrentSourceUrl = useCallback((): string | undefined => {
    if (typeof window === 'undefined') {
      return undefined
    }

    return sanitizeSourceUrl(window.location.href)
  }, [])

  const captureCurrentSourceUrl = useCallback(
    (
      record: InteractiveStateRecord,
      existingRecord?: InteractiveStateRecord | null,
    ): InteractiveStateRecord => {
      const sourceUrl = getCurrentSourceUrl() ?? sanitizeSourceUrl(existingRecord?.sourceUrl)
      return withSourceUrl(record, sourceUrl)
    },
    [getCurrentSourceUrl],
  )

  const preserveExistingSourceUrl = useCallback(
    (
      record: InteractiveStateRecord,
      existingRecord?: InteractiveStateRecord | null,
    ): InteractiveStateRecord =>
      withSourceUrl(record, sanitizeSourceUrl(existingRecord?.sourceUrl)),
    [],
  )

  const createInteractiveUpdatedEvent = useCallback(
    (payload: {
      readonly record: InteractiveStateRecord
      readonly auditEvents?: readonly InteractiveAuditEvent[]
    }): LearningProgressEvent => {
      return {
        eventId: createEventId(),
        occurredAt: payload.record.updatedAt,
        clientId: getClientId(),
        type: 'interactive.updated',
        payload,
      }
    },
    [getClientId],
  )

  const buildSnapshotBackfillEvents = useCallback(
    (params: {
      readonly localSnapshot: LearningGuestProgress
      readonly remoteRecordsByKey: Readonly<Record<string, InteractiveStateRecord>>
      readonly pendingEvents: readonly LearningProgressEvent[]
    }): LearningProgressEvent[] => {
      const pendingRecordKeys = new Set(
        params.pendingEvents
          .filter((event): event is Extract<LearningProgressEvent, { readonly type: 'interactive.updated' }> =>
            event.type === 'interactive.updated')
          .map((event) => event.payload.record.key),
      )

      return Object.values(params.localSnapshot.interactiveState.recordsByKey)
        .filter((record) => {
          if (pendingRecordKeys.has(record.key)) {
            return false
          }

          if (record.review !== undefined) {
            return false
          }

          const remoteRecord = params.remoteRecordsByKey[record.key]
          if (!remoteRecord) {
            return true
          }

          return compareIsoInstants(record.updatedAt, remoteRecord.updatedAt) > 0
        })
        .map((record) => createInteractiveUpdatedEvent({ record }))
    },
    [createInteractiveUpdatedEvent],
  )

  const canWriteToStorage = useCallback((): boolean => {
    if (typeof window === 'undefined') {
      return false
    }

    if (!storageBlockedRef.current) {
      return true
    }

    try {
      window.localStorage.setItem(STORAGE_PROBE_KEY, '1')
      window.localStorage.removeItem(STORAGE_PROBE_KEY)
      storageBlockedRef.current = false
      return true
    } catch {
      return false
    }
  }, [])

  const safeWriteToStorage = useCallback((key: string, value: unknown): boolean => {
    if (!canWriteToStorage()) return false
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      if (isQuotaExceededError(error)) {
        storageBlockedRef.current = true
        console.warn('LocalStorage quota exceeded; progress will be kept in memory only.', error)
      }
      return false
    }
  }, [canWriteToStorage])

  const loadEventsForKey = useCallback((eventsKey: string): LearningProgressEvent[] => {
    const rawEvents = readJsonFromLocalStorage(eventsKey)
    return parseLearningProgressEvents(rawEvents)
  }, [])

  const loadSnapshotForKey = useCallback((snapshotKey: string): LearningGuestProgress | null => {
    const rawSnapshot = readJsonFromLocalStorage(snapshotKey, {
      expectedVersion: LEARNING_PROGRESS_SCHEMA_VERSION,
    })
    if (!rawSnapshot) {
      return null
    }

    return parseLearningGuestProgress(rawSnapshot)
  }, [])

  const saveSnapshotForKey = useCallback(
    (snapshotKey: string, snapshot: LearningGuestProgress): void => {
      safeWriteToStorage(snapshotKey, snapshot)
    },
    [safeWriteToStorage],
  )

  const updateSyncEntry = useCallback(
    (eventId: string, updater: (entry: LearningProgressSyncEntry) => LearningProgressSyncEntry) => {
      const current = syncStateRef.current.events[eventId] ?? {
        status: 'local',
        lastAttemptAt: null,
        lastSyncedAt: null,
        retryCount: 0,
      }
      syncStateRef.current = {
        ...syncStateRef.current,
        events: {
          ...syncStateRef.current.events,
          [eventId]: updater(current),
        },
      }
    },
    [],
  )

  const removeSyncEntries = useCallback((eventIds: readonly string[]) => {
    if (eventIds.length === 0) return

    const nextEvents = { ...syncStateRef.current.events }
    for (const eventId of eventIds) {
      delete nextEvents[eventId]
    }

    syncStateRef.current = {
      ...syncStateRef.current,
      events: nextEvents,
    }
  }, [])

  const persistSyncState = useCallback(
    (syncKey: string | null) => {
      if (!syncKey) return
      safeWriteToStorage(syncKey, syncStateRef.current)
    },
    [safeWriteToStorage],
  )

  const applyEventsToSnapshot = useCallback(
    (
      baseSnapshot: LearningGuestProgress,
      events: readonly LearningProgressEvent[],
      snapshotKey: string | null,
    ) => {
      const nextSnapshot = events.reduce(
        (currentSnapshot, event) => applyLearningProgressEvent(currentSnapshot, event),
        baseSnapshot,
      )

      if (snapshotKey) {
        saveSnapshotForKey(snapshotKey, nextSnapshot)
      }

      setProgress(nextSnapshot)
      return nextSnapshot
    },
    [saveSnapshotForKey],
  )

  const getStorageKeys = useCallback(() => {
    if (auth.isAuthenticated && auth.userId) {
      return {
        eventsKey: getAuthEventsKey(auth.userId),
        snapshotKey: getAuthSnapshotKey(auth.userId),
        syncKey: getAuthSyncKey(auth.userId),
      }
    }
    return {
      eventsKey: GUEST_EVENTS_KEY,
      snapshotKey: GUEST_SNAPSHOT_KEY,
      syncKey: null,
    }
  }, [auth.isAuthenticated, auth.userId])

  const recomputeFromStorage = useCallback(() => {
    const keys = getStorageKeys()
    const events = loadEventsForKey(keys.eventsKey)
    eventsRef.current = events
    if (keys.syncKey) {
      syncStateRef.current = parseSyncState(
        readJsonFromLocalStorage(keys.syncKey, { expectedVersion: 1 }),
      )
    }
    const storedSnapshot = loadSnapshotForKey(keys.snapshotKey)

    if (storedSnapshot) {
      if (events.length > 0) {
        applyEventsToSnapshot(storedSnapshot, events, keys.snapshotKey)
        return
      }

      setProgress(storedSnapshot)
      return
    }

    const nextSnapshot = reduceLearningProgressEvents(events)
    saveSnapshotForKey(keys.snapshotKey, nextSnapshot)
    setProgress(nextSnapshot)
  }, [applyEventsToSnapshot, getStorageKeys, loadEventsForKey, loadSnapshotForKey, saveSnapshotForKey])

  const applyRemoteProgress = useCallback(
    (remote: RemoteLearningProgress, keys: { eventsKey: string; snapshotKey: string; syncKey: string | null }) => {
      syncStateRef.current = {
        ...syncStateRef.current,
        lastSyncedCursor: remote.cursor ?? syncStateRef.current.lastSyncedCursor,
      }

      setProgress((current) => {
        const nextSnapshot = reconcileLearningGuestProgressWithRemote(
          current,
          remote.snapshot,
          remote.events,
        )
        saveSnapshotForKey(keys.snapshotKey, nextSnapshot)
        return nextSnapshot
      })

      persistSyncState(keys.syncKey)
    },
    [persistSyncState, saveSnapshotForKey],
  )

  const progressQuery = useQuery({
    queryKey: progressQueryKey,
    queryFn: async () => {
      if (!auth.isAuthenticated || !auth.userId) {
        throw new Error('Missing authenticated user')
      }
      return fetchLearningProgress({ since: syncStateRef.current.lastSyncedCursor })
    },
    enabled: auth.isAuthenticated && bootstrapPhase !== 'loading',
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: false,
    refetchInterval: auth.isAuthenticated ? REMOTE_REFRESH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    retry: 1,
  })

  const refetchRemoteProgress = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.userId) return
    await progressQuery.refetch()
  }, [auth.isAuthenticated, auth.userId, progressQuery])

  useEffect(() => {
    if (!auth.isAuthenticated || !progressQuery.data || bootstrapPhase === 'loading') return
    const keys = getStorageKeys()
    applyRemoteProgress(progressQuery.data, keys)
    if (bootstrapPhase !== 'ready') {
      setBootstrapPhase('ready')
    }
  }, [applyRemoteProgress, auth.isAuthenticated, bootstrapPhase, getStorageKeys, progressQuery.data])

  useEffect(() => {
    if (!progressQuery.error) return
    console.warn('Failed to pull remote learning progress events:', progressQuery.error)
  }, [progressQuery.error])

  const queueSync = useCallback(() => {
    if (!auth.isAuthenticated) return
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current)
    }
    syncTimeoutRef.current = window.setTimeout(() => {
      syncTimeoutRef.current = null
      void syncNowRef.current()
    }, SYNC_DEBOUNCE_MS)
  }, [auth.isAuthenticated])

  const scheduleRetry = useCallback((delay: number) => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current)
    }
    retryTimeoutRef.current = window.setTimeout(() => {
      retryTimeoutRef.current = null
      void syncNowRef.current()
    }, delay)
  }, [])

  const compactGuestPendingEvents = useCallback(
    (
      snapshot: LearningGuestProgress,
      currentEvents: readonly LearningProgressEvent[],
    ): LearningProgressEvent[] => {
      if (auth.isAuthenticated || currentEvents.length <= MAX_GUEST_PENDING_EVENTS) {
        return [...currentEvents]
      }

      const latestResetEvent = [...currentEvents].reverse().find((event) => event.type === 'progress.reset') ?? null
      const compactedRecordEvents = Object.values(snapshot.interactiveState.recordsByKey)
        .sort((leftRecord, rightRecord) => {
          const timeDiff = Date.parse(leftRecord.updatedAt) - Date.parse(rightRecord.updatedAt)
          if (!Number.isNaN(timeDiff) && timeDiff !== 0) {
            return timeDiff
          }

          return leftRecord.key.localeCompare(rightRecord.key)
        })
        .map((record) => createInteractiveUpdatedEvent({
          record,
          auditEvents: snapshot.interactiveState.eventLogByRecordKey[record.key],
        }))

      return latestResetEvent ? [latestResetEvent, ...compactedRecordEvents] : compactedRecordEvents
    },
    [auth.isAuthenticated, createInteractiveUpdatedEvent],
  )

  const syncNow = useCallback(async () => {
    if (isBootstrappingRef.current) return
    if (!auth.isAuthenticated || !auth.userId) {
      recomputeFromStorage()
      return
    }
    if (syncInFlightRef.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = null
    }
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    const syncKey = getAuthSyncKey(auth.userId)
    const eventsKey = getAuthEventsKey(auth.userId)
    const pendingEvents = eventsRef.current.filter((event) => {
      const entry = syncStateRef.current.events[event.eventId]
      if (!entry) return true
      if (entry.status === 'local') return true
      if (entry.status === 'error' && entry.retryCount < MAX_RETRIES) return true
      return false
    })

    if (pendingEvents.length === 0) {
      syncInFlightRef.current = true
      try {
        await refetchRemoteProgress()
      } finally {
        syncInFlightRef.current = false
      }
      return
    }

    syncInFlightRef.current = true
    let shouldRefetchRemoteProgress = false
    let completedAllChunks = true

    try {
      const pendingChunks = chunkArray(pendingEvents, MAX_SYNC_EVENTS_PER_REQUEST)

      for (const pendingChunk of pendingChunks) {
        const attemptAt = nowIso()

        for (const event of pendingChunk) {
          updateSyncEntry(event.eventId, (entry) => ({
            ...entry,
            status: 'syncing',
            lastAttemptAt: attemptAt,
          }))
        }
        persistSyncState(syncKey)

        const syncResult = await syncLearningProgressEvents({
          events: pendingChunk,
          clientUpdatedAt: attemptAt,
        })

        if (!syncResult.ok) {
          if (syncResult.error.retryable) {
            completedAllChunks = false

            for (const event of pendingChunk) {
              updateSyncEntry(event.eventId, (entry) => ({
                ...entry,
                status: 'error',
                retryCount: entry.retryCount + 1,
                errorMessage: syncResult.error.message,
              }))
            }

            persistSyncState(syncKey)

            const maxRetry = pendingChunk.reduce((maxRetryCount, event) => {
              const entry = syncStateRef.current.events[event.eventId]
              return Math.max(maxRetryCount, entry?.retryCount ?? 0)
            }, 0)

            if (maxRetry <= MAX_RETRIES) {
              const delay = RETRY_DELAYS[Math.min(maxRetry, RETRY_DELAYS.length - 1)]
              scheduleRetry(delay)
            }

            break
          }

          const permanentlyFailedEventIds = new Set(pendingChunk.map((event) => event.eventId))
          for (const event of pendingChunk) {
            updateSyncEntry(event.eventId, (entry) => ({
              ...entry,
              status: 'quarantined',
              retryCount: MAX_RETRIES + 1,
              errorMessage: syncResult.error.message,
            }))
          }

          eventsRef.current = eventsRef.current.filter((event) => !permanentlyFailedEventIds.has(event.eventId))
          safeWriteToStorage(eventsKey, eventsRef.current)
          persistSyncState(syncKey)
          continue
        }

        const failedEventById = new Map(
          syncResult.data.failedEvents.map((failedEvent) => [failedEvent.eventId, failedEvent]),
        )
        const successfulEventIds = pendingChunk
          .map((event) => event.eventId)
          .filter((eventId) => !failedEventById.has(eventId))

        if (successfulEventIds.length > 0) {
          const successfulEventIdsSet = new Set(successfulEventIds)
          eventsRef.current = eventsRef.current.filter((event) => !successfulEventIdsSet.has(event.eventId))
          safeWriteToStorage(eventsKey, eventsRef.current)
          removeSyncEntries(successfulEventIds)
          syncStateRef.current = {
            ...syncStateRef.current,
            lastSuccessfulSyncAt: attemptAt,
          }
          shouldRefetchRemoteProgress = shouldRefetchRemoteProgress || syncResult.data.newEventsCount > 0
        }

        if (syncResult.data.failedEvents.length > 0) {
          const failedEventIds = new Set(syncResult.data.failedEvents.map((failedEvent) => failedEvent.eventId))

          for (const failedEvent of syncResult.data.failedEvents) {
            updateSyncEntry(failedEvent.eventId, (entry) => ({
              ...entry,
              status: 'quarantined',
              retryCount: MAX_RETRIES + 1,
              errorMessage: failedEvent.message,
            }))
          }

          eventsRef.current = eventsRef.current.filter((event) => !failedEventIds.has(event.eventId))
          safeWriteToStorage(eventsKey, eventsRef.current)
        }

        persistSyncState(syncKey)
      }

      if (pendingGuestCleanupRef.current && completedAllChunks && eventsRef.current.length === 0) {
        removeFromStorage(GUEST_EVENTS_KEY)
        removeFromStorage(GUEST_SNAPSHOT_KEY)
        pendingGuestCleanupRef.current = false
      }

      if (shouldRefetchRemoteProgress) {
        await refetchRemoteProgress()
      }
    } finally {
      syncInFlightRef.current = false
    }
  }, [
    auth.isAuthenticated,
    auth.userId,
    persistSyncState,
    removeSyncEntries,
    refetchRemoteProgress,
    recomputeFromStorage,
    safeWriteToStorage,
    scheduleRetry,
    updateSyncEntry,
  ])

  useEffect(() => {
    syncNowRef.current = syncNow
  }, [syncNow])

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current)
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  const appendEvents = useCallback(
    (
      events: readonly LearningProgressEvent[],
      storageKeys: { eventsKey: string; snapshotKey: string; syncKey: string | null },
      options?: { readonly replacePending?: boolean },
    ) => {
      if (events.length === 0) {
        return
      }

      const baseSnapshot = options?.replacePending ? getEmptyLearningGuestProgress() : progressRef.current
      const nextSnapshot = events.reduce(
        (currentSnapshot, event) => applyLearningProgressEvent(currentSnapshot, event),
        baseSnapshot,
      )

      let nextEvents = options?.replacePending
        ? [...events]
        : [...eventsRef.current, ...events]
      nextEvents = compactGuestPendingEvents(nextSnapshot, nextEvents)
      eventsRef.current = nextEvents
      const eventsWritten = safeWriteToStorage(storageKeys.eventsKey, nextEvents)

      for (const event of events) {
        updateSyncEntry(event.eventId, (entry) => ({
          ...entry,
          status: eventsWritten ? 'local' : 'error',
          retryCount: entry.retryCount ?? 0,
          errorMessage: eventsWritten ? undefined : 'localStorage quota exceeded',
        }))
      }

      if (options?.replacePending) {
        const preservedEventIds = new Set(events.map((event) => event.eventId))
        removeSyncEntries(
          Object.keys(syncStateRef.current.events).filter((eventId) => !preservedEventIds.has(eventId)),
        )
      }

      if (storageKeys.syncKey) {
        persistSyncState(storageKeys.syncKey)
      }

      saveSnapshotForKey(storageKeys.snapshotKey, nextSnapshot)
      setProgress(nextSnapshot)

      queueSync()
    },
    [
      compactGuestPendingEvents,
      persistSyncState,
      queueSync,
      removeSyncEntries,
      safeWriteToStorage,
      saveSnapshotForKey,
      updateSyncEntry,
    ],
  )

  useEffect(() => {
    let cancelled = false

    if (!isLoaded) {
      const guestEvents = loadEventsForKey(GUEST_EVENTS_KEY)
      eventsRef.current = guestEvents
      const guestSnapshot = loadSnapshotForKey(GUEST_SNAPSHOT_KEY)
      if (guestSnapshot) {
        setProgress(guestSnapshot)
      } else {
        const nextSnapshot = reduceLearningProgressEvents(guestEvents)
        saveSnapshotForKey(GUEST_SNAPSHOT_KEY, nextSnapshot)
        setProgress(nextSnapshot)
      }
      setIsReady(true)
      setBootstrapPhase('loading')
      return () => {
        cancelled = true
      }
    }

    const keys = getStorageKeys()

    if (!auth.isAuthenticated || !auth.userId) {
      eventsRef.current = loadEventsForKey(keys.eventsKey)
      const localSnapshot = loadSnapshotForKey(keys.snapshotKey)
      if (localSnapshot) {
        setProgress(localSnapshot)
      } else {
        const nextSnapshot = reduceLearningProgressEvents(eventsRef.current)
        saveSnapshotForKey(keys.snapshotKey, nextSnapshot)
        setProgress(nextSnapshot)
      }
      setIsReady(true)
      setBootstrapPhase('ready')
      return () => {
        cancelled = true
      }
    }

    const bootstrap = async () => {
      isBootstrappingRef.current = true
      queuedEventsRef.current = []
      hasShownBootstrapLoadingToastRef.current = false
      hasShownBootstrapFailedToastRef.current = false

      hasShownBootstrapLoadingToastRef.current = true

      const guestEvents = loadEventsForKey(GUEST_EVENTS_KEY)
      const localEvents = loadEventsForKey(keys.eventsKey)
      const guestSnapshot = loadSnapshotForKey(GUEST_SNAPSHOT_KEY)
      const localSnapshot = loadSnapshotForKey(keys.snapshotKey)
      const localSync = parseSyncState(
        keys.syncKey
          ? readJsonFromLocalStorage(keys.syncKey, { expectedVersion: 1 })
          : null,
      )
      syncStateRef.current = localSync

      const mergedPendingEvents = mergeEventLogs(guestEvents, localEvents)
      const localMergedSnapshot = mergeLearningGuestProgress(
        guestSnapshot ?? getEmptyLearningGuestProgress(),
        localSnapshot ?? getEmptyLearningGuestProgress(),
      )
      const localHydratedSnapshot = mergedPendingEvents.reduce(
        (currentSnapshot, event) => applyLearningProgressEvent(currentSnapshot, event),
        localMergedSnapshot,
      )

      if (cancelled) {
        return
      }

      eventsRef.current = mergedPendingEvents
      safeWriteToStorage(keys.eventsKey, mergedPendingEvents)
      saveSnapshotForKey(keys.snapshotKey, localHydratedSnapshot)
      setProgress(localHydratedSnapshot)
      setIsReady(true)
      setBootstrapPhase('loading')

      let remoteProgress: RemoteLearningProgress | null = null
      let bootstrapError: unknown = null

      for (let attempt = 1; attempt <= BOOTSTRAP_MAX_ATTEMPTS; attempt += 1) {
        try {
          remoteProgress = await fetchLearningProgress()
          bootstrapError = null
          break
        } catch (error) {
          bootstrapError = error

          if (error instanceof UnsupportedLearningProgressSnapshotVersionError) {
            logger.error('Learning progress bootstrap returned an unsupported snapshot version.', {
              error,
              userId: auth.userId,
            })
            break
          }

          if (attempt < BOOTSTRAP_MAX_ATTEMPTS) {
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, BOOTSTRAP_RETRY_DELAY_MS)
            })
            if (cancelled) {
              return
            }
            continue
          }

          logger.warn('Failed to fetch remote learning progress during bootstrap.', {
            error,
            userId: auth.userId,
          })
          break
        }
      }

      if (cancelled) {
        return
      }

      let finalPendingEvents = mergedPendingEvents
      let nextSnapshot = localHydratedSnapshot

      if (remoteProgress) {
        const backfillEvents = buildSnapshotBackfillEvents({
          localSnapshot: localHydratedSnapshot,
          remoteRecordsByKey: remoteProgress.snapshot.recordsByKey,
          pendingEvents: finalPendingEvents,
        })
        finalPendingEvents = mergeEventLogs(finalPendingEvents, backfillEvents)
        nextSnapshot = reconcileLearningGuestProgressWithRemote(
          localHydratedSnapshot,
          remoteProgress.snapshot,
          remoteProgress.events,
        )
        syncStateRef.current = {
          ...syncStateRef.current,
          lastSyncedCursor: remoteProgress.cursor ?? syncStateRef.current.lastSyncedCursor,
        }
      } else if (!hasShownBootstrapFailedToastRef.current) {
        hasShownBootstrapFailedToastRef.current = true
        toast.warning(t`Could not sync with server. Your progress is saved locally.`)
      }

      if (queuedEventsRef.current.length > 0) {
        finalPendingEvents = mergeEventLogs(finalPendingEvents, queuedEventsRef.current)
        nextSnapshot = queuedEventsRef.current.reduce(
          (currentSnapshot, event) => applyLearningProgressEvent(currentSnapshot, event),
          nextSnapshot,
        )
        queuedEventsRef.current = []
      }

      eventsRef.current = finalPendingEvents
      safeWriteToStorage(keys.eventsKey, finalPendingEvents)
      saveSnapshotForKey(keys.snapshotKey, nextSnapshot)
      setProgress(nextSnapshot)

      persistSyncState(keys.syncKey)

      if (guestEvents.length > 0) {
        pendingGuestCleanupRef.current = true
      }

      isBootstrappingRef.current = false
      setBootstrapPhase(remoteProgress ? 'ready' : 'failed')

      if (bootstrapError && !(bootstrapError instanceof UnsupportedLearningProgressSnapshotVersionError)) {
        logger.warn('Learning progress bootstrap finished with local-only state.', {
          error: bootstrapError,
          userId: auth.userId,
        })
      }

      queueSync()
    }

    setBootstrapPhase('loading')
    void bootstrap()

    return () => {
      cancelled = true
      isBootstrappingRef.current = false
    }
  }, [
    auth.isAuthenticated,
    auth.userId,
    buildSnapshotBackfillEvents,
    getStorageKeys,
    isLoaded,
    loadEventsForKey,
    persistSyncState,
    queueSync,
    saveSnapshotForKey,
    safeWriteToStorage,
    loadSnapshotForKey,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let storageDebounceTimeout: number | null = null
    const handler = (event: StorageEvent) => {
      if (
        event.key?.startsWith('learning_progress_events') ||
        event.key?.startsWith('learning_progress_snapshot') ||
        event.key?.startsWith('learning_progress_sync')
      ) {
        if (storageDebounceTimeout) window.clearTimeout(storageDebounceTimeout)
        storageDebounceTimeout = window.setTimeout(() => {
          recomputeFromStorage()
        }, 100)
      }
    }
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('storage', handler)
      if (storageDebounceTimeout) window.clearTimeout(storageDebounceTimeout)
    }
  }, [recomputeFromStorage])

  const buildContentProjectionEvents = useCallback(
    (input: SaveContentProgressInput, occurredAt: string): LearningProgressEvent[] => {
      const currentProgress = progressRef.current
      const existingContent = currentProgress.content[input.contentId]
      const existingLessonProgressRecord =
        currentProgress.interactiveState.recordsByKey[
          `${SYSTEM_LESSON_PROGRESS_RECORD_PREFIX}${input.contentId}`
        ]
      const nextContent = upsertProjectedContentProgress({
        existing: existingContent,
        now: occurredAt,
        contentId: input.contentId,
        status: input.status,
        score: clampScore(input.score),
        contentVersion: input.contentVersion,
      })

      const nextEvents: LearningProgressEvent[] = [
        createInteractiveUpdatedEvent({
          record: createLessonProgressRecord({
            progress: nextContent,
            updatedAt: getNextTimestamp(existingLessonProgressRecord?.updatedAt ?? occurredAt),
          }),
        }),
      ]

      const wasCompleted =
        existingContent?.status === 'completed' || existingContent?.status === 'passed'
      const isCompleted =
        nextContent.status === 'completed' || nextContent.status === 'passed'

      if (!wasCompleted && isCompleted) {
        const existingStreakRecord =
          currentProgress.interactiveState.recordsByKey[SYSTEM_LEARNING_STREAK_RECORD_KEY]
        nextEvents.push(
          createInteractiveUpdatedEvent({
            record: createLearningStreakRecord({
              streak: calculateStreakUpdate(currentProgress.streak, toDateString(occurredAt)),
              updatedAt: getNextTimestamp(existingStreakRecord?.updatedAt ?? occurredAt),
            }),
          }),
        )
      }

      return nextEvents
    },
    [createInteractiveUpdatedEvent],
  )

  const saveContentProgress = useCallback(
    async (input: SaveContentProgressInput) => {
      if (!input.contentId.trim()) throw new Error(t`Missing content id`)
      const occurredAt = nowIso()
      const events = buildContentProjectionEvents(input, occurredAt)

      if (isBootstrappingRef.current) {
        queuedEventsRef.current.push(...events)
        setProgress((current) => events.reduce(
          (currentSnapshot, event) => applyLearningProgressEvent(currentSnapshot, event),
          current,
        ))
        for (const event of events) {
          updateSyncEntry(event.eventId, (entry) => ({
            ...entry,
            status: 'local',
          }))
        }
        return
      }

      const keys = getStorageKeys()
      appendEvents(events, { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey })
    },
    [appendEvents, buildContentProjectionEvents, getStorageKeys, updateSyncEntry],
  )

  const appendInteractiveUpdateEvent = useCallback(
    async (payload: {
      readonly record: InteractiveStateRecord
      readonly auditEvents?: readonly InteractiveAuditEvent[]
      readonly content?: SaveContentProgressInput
    }) => {
      const nextEvents: LearningProgressEvent[] = [
        createInteractiveUpdatedEvent({
          record: payload.record,
          auditEvents: payload.auditEvents,
        }),
        ...(payload.content ? buildContentProjectionEvents(payload.content, payload.record.updatedAt) : []),
      ]

      if (isBootstrappingRef.current) {
        queuedEventsRef.current.push(...nextEvents)
        setProgress((current) => nextEvents.reduce(
          (currentSnapshot, event) => applyLearningProgressEvent(currentSnapshot, event),
          current,
        ))
        for (const event of nextEvents) {
          updateSyncEntry(event.eventId, (entry) => ({
            ...entry,
            status: 'local',
          }))
        }
        return
      }

      const keys = getStorageKeys()
      appendEvents(nextEvents, {
        eventsKey: keys.eventsKey,
        snapshotKey: keys.snapshotKey,
        syncKey: keys.syncKey,
      })
    },
    [appendEvents, buildContentProjectionEvents, createInteractiveUpdatedEvent, getStorageKeys, updateSyncEntry],
  )

  const getInteractiveRecordForDefinition = useCallback(
    (
      definition: Pick<InteractiveDefinition, 'id' | 'scopePolicy'>,
      entityCui?: string | null,
    ) => getInteractiveRecord(progress.interactiveState, definition, entityCui),
    [progress.interactiveState],
  )

  const getInteractiveAuditLogForRecord = useCallback(
    (recordKey: string) => getInteractiveAuditLog(progress.interactiveState, recordKey),
    [progress.interactiveState],
  )

  const saveInteractiveDraft = useCallback(
    async (input: SaveInteractiveDraftInput): Promise<InteractiveStateRecord | null> => {
      assertEntityScopeMutationInput(input.definition, input.entityCui)
      const scope = resolveInteractionScope(input.definition, input.entityCui)
      if (!scope) {
        return null
      }

      const existingRecord = getInteractiveRecordForDefinition(
        input.definition,
        input.entityCui,
      )

      const nextRecord = createInteractiveStateRecord({
        definition: input.definition,
        scope,
        phase: 'draft',
        value: input.value,
        result: null,
        updatedAt: getNextTimestamp(existingRecord?.updatedAt),
        submittedAt: null,
      })
      const nextRecordWithSourceUrl = captureCurrentSourceUrl(nextRecord, existingRecord)

      await appendInteractiveUpdateEvent({
        record: nextRecordWithSourceUrl,
        content: input.content,
      })
      return nextRecordWithSourceUrl
    },
    [
      appendInteractiveUpdateEvent,
      captureCurrentSourceUrl,
      getInteractiveRecordForDefinition,
    ],
  )

  const submitInteractive = useCallback(
    async (input: SubmitInteractiveInput): Promise<InteractiveStateRecord | null> => {
      assertEntityScopeMutationInput(input.definition, input.entityCui)
      const scope = resolveInteractionScope(input.definition, input.entityCui)
      if (!scope) {
        return null
      }

      const existingRecord = getInteractiveRecordForDefinition(
        input.definition,
        input.entityCui,
      )
      const nextValue = input.value ?? existingRecord?.value ?? null
      if (!nextValue) {
        return null
      }

      // Public submit path for async-review interactions:
      // `pending` + `submittedAt` + no `result`. Final review outcome is
      // attached later by the server in `record.review`.
      const submittedAt = getNextTimestamp(existingRecord?.updatedAt)
      const nextRecord = createInteractiveStateRecord({
        definition: input.definition,
        scope,
        phase: 'pending',
        value: nextValue,
        result: null,
        updatedAt: submittedAt,
        submittedAt,
      })
      const nextRecordWithSourceUrl = captureCurrentSourceUrl(nextRecord, existingRecord)

      const auditEvent: InteractiveAuditEvent = {
        id: createEventId(),
        recordKey: nextRecordWithSourceUrl.key,
        lessonId: nextRecordWithSourceUrl.lessonId,
        interactionId: nextRecordWithSourceUrl.interactionId,
        type: 'submitted',
        at: submittedAt,
        actor: 'user',
        value: nextValue,
      }

      await appendInteractiveUpdateEvent({
        record: nextRecordWithSourceUrl,
        auditEvents: [auditEvent],
        content: input.content,
      })

      return nextRecordWithSourceUrl
    },
    [
      appendInteractiveUpdateEvent,
      captureCurrentSourceUrl,
      getInteractiveRecordForDefinition,
    ],
  )

  const resolveInteractive = useCallback(
    async (input: ResolveInteractiveInput): Promise<InteractiveStateRecord | null> => {
      assertEntityScopeMutationInput(input.definition, input.entityCui)
      const scope = resolveInteractionScope(input.definition, input.entityCui)
      if (!scope) {
        return null
      }

      const existingRecord = getInteractiveRecordForDefinition(
        input.definition,
        input.entityCui,
      )
      const nextValue = input.value ?? existingRecord?.value ?? null
      if (!nextValue) {
        return null
      }

      // Immediate-eval path: the client resolves the interaction in one step
      // and records the outcome in `result` without using `review`.
      const updatedAt = getNextTimestamp(existingRecord?.updatedAt)
      const phase = input.phase ?? 'resolved'
      const result = {
        outcome: input.outcome ?? null,
        score: input.score ?? null,
        feedbackText: input.feedbackText ?? null,
        response: input.response ?? null,
        evaluatedAt: updatedAt,
      } as const

      const nextRecord = createInteractiveStateRecord({
        definition: input.definition,
        scope,
        phase,
        value: nextValue,
        result,
        updatedAt,
        submittedAt: updatedAt,
      })
      const nextRecordWithSourceUrl = captureCurrentSourceUrl(nextRecord, existingRecord)

      const auditEvents: InteractiveAuditEvent[] = [
        {
          id: createEventId(),
          recordKey: nextRecordWithSourceUrl.key,
          lessonId: nextRecordWithSourceUrl.lessonId,
          interactionId: nextRecordWithSourceUrl.interactionId,
          type: 'submitted',
          at: updatedAt,
          actor: 'user',
          value: nextValue,
        },
        {
          id: createEventId(),
          recordKey: nextRecordWithSourceUrl.key,
          lessonId: nextRecordWithSourceUrl.lessonId,
          interactionId: nextRecordWithSourceUrl.interactionId,
          type: 'evaluated',
          at: updatedAt,
          actor: 'system',
          phase,
          result,
        },
      ]

      await appendInteractiveUpdateEvent({
        record: nextRecordWithSourceUrl,
        auditEvents,
        content: input.content,
      })

      return nextRecordWithSourceUrl
    },
    [
      appendInteractiveUpdateEvent,
      captureCurrentSourceUrl,
      getInteractiveRecordForDefinition,
    ],
  )

  const applyInteractiveEvaluation = useCallback(
    async (input: ApplyInteractiveEvaluationInput): Promise<InteractiveStateRecord | null> => {
      const existingRecord = progress.interactiveState.recordsByKey[input.recordKey]
      if (!existingRecord) {
        return null
      }

      const evaluatedAt = getNextTimestamp(existingRecord.updatedAt)
      const phase = input.phase ?? 'resolved'
      const result = {
        outcome: input.outcome ?? null,
        score: input.score ?? existingRecord.result?.score ?? null,
        feedbackText: input.feedbackText ?? null,
        response: input.response ?? null,
        evaluatedAt,
      } as const
      const nextRecord: InteractiveStateRecord = {
        ...existingRecord,
        phase,
        result,
        updatedAt: evaluatedAt,
      }
      const nextRecordWithSourceUrl = preserveExistingSourceUrl(nextRecord, existingRecord)

      const auditEvent: InteractiveAuditEvent = {
        id: createEventId(),
        recordKey: nextRecordWithSourceUrl.key,
        lessonId: nextRecordWithSourceUrl.lessonId,
        interactionId: nextRecordWithSourceUrl.interactionId,
        type: 'evaluated',
        at: evaluatedAt,
        actor: 'system',
        phase,
        result,
      }

      await appendInteractiveUpdateEvent({
        record: nextRecordWithSourceUrl,
        auditEvents: [auditEvent],
        content: input.content,
      })

      return nextRecordWithSourceUrl
    },
    [appendInteractiveUpdateEvent, preserveExistingSourceUrl, progress.interactiveState.recordsByKey],
  )

  const resetInteractive = useCallback(
    async (input: ResetInteractiveInput): Promise<InteractiveStateRecord | null> => {
      assertEntityScopeMutationInput(input.definition, input.entityCui)
      const scope = resolveInteractionScope(input.definition, input.entityCui)
      if (!scope) {
        return null
      }

      const nextRecord = createInteractiveStateRecord({
        definition: input.definition,
        scope,
        phase: 'idle',
        value: null,
        result: null,
        updatedAt: getNextTimestamp(
          getInteractiveRecordForDefinition(input.definition, input.entityCui)?.updatedAt,
        ),
        submittedAt: null,
      })
      const nextRecordWithSourceUrl = preserveExistingSourceUrl(
        nextRecord,
        getInteractiveRecordForDefinition(input.definition, input.entityCui),
      )

      await appendInteractiveUpdateEvent({ record: nextRecordWithSourceUrl })
      return nextRecordWithSourceUrl
    },
    [appendInteractiveUpdateEvent, getInteractiveRecordForDefinition, preserveExistingSourceUrl],
  )

  const dispatchInteractionAction = useCallback(
    async (action: LearningInteractionAction) => {
      switch (action.type) {
        case 'quiz.answer': {
          await resolveInteractive({
            definition: {
              id: action.interactionId,
              lessonId: action.contentId,
              kind: 'quiz',
              scopePolicy: 'global',
              completionRule: { type: 'outcome', outcome: 'correct' },
            },
            value: {
              kind: 'choice',
              choice: { selectedId: action.selectedOptionId },
            },
            outcome: action.score >= 70 ? 'correct' : 'incorrect',
            score: clampScore(action.score) ?? null,
            content: {
              contentId: action.contentId,
              status: 'in_progress',
              score: clampScore(action.score),
              contentVersion: action.contentVersion,
            },
          })
          return
        }
        case 'quiz.reset': {
          await resetInteractive({
            definition: {
              id: action.interactionId,
              lessonId: action.contentId,
              kind: 'quiz',
              scopePolicy: 'global',
              completionRule: { type: 'outcome', outcome: 'correct' },
            },
          })
          return
        }
        case 'prediction.reveal': {
          const definition: InteractiveDefinition = {
            id: action.interactionId,
            lessonId: action.contentId,
            kind: 'custom',
            scopePolicy: 'global',
            completionRule: { type: 'resolved' },
          }
          const existingRecord = getInteractiveRecordForDefinition(definition)
          const existingValue = existingRecord?.value?.kind === 'json'
            ? (existingRecord.value.json.value as Record<string, unknown>)
            : {}
          const existingReveals =
            typeof existingValue.reveals === 'object' && existingValue.reveals !== null
              ? (existingValue.reveals as Record<string, unknown>)
              : {}
          await resolveInteractive({
            definition,
            value: {
              kind: 'json',
              json: {
                value: {
                  reveals: {
                    ...existingReveals,
                    [action.year]: {
                      guess: action.guess,
                      actualRate: action.actualRate,
                      revealedAt: nowIso(),
                    },
                  },
                },
              },
            },
            outcome: null,
            content: {
              contentId: action.contentId,
              status: 'in_progress',
              contentVersion: action.contentVersion,
            },
          })
          return
        }
        case 'prediction.reset': {
          await resetInteractive({
            definition: {
              id: action.interactionId,
              lessonId: action.contentId,
              kind: 'custom',
              scopePolicy: 'global',
              completionRule: { type: 'resolved' },
            },
          })
          return
        }
        case 'salaryCalculator.save': {
          const definition: InteractiveDefinition = {
            id: action.interactionId,
            lessonId: action.contentId,
            kind: 'custom',
            scopePolicy: 'global',
            completionRule: { type: 'resolved' },
          }
          const nextValue: InteractionValue = {
            kind: 'json',
            json: {
              value: {
                gross: action.gross,
                userGuess: action.userGuess,
                step: action.step,
              },
            },
          }

          if (action.step === 'REVEAL') {
            await resolveInteractive({
              definition,
              value: nextValue,
              outcome: null,
              content: {
                contentId: action.contentId,
                status: 'in_progress',
                contentVersion: action.contentVersion,
              },
            })
          } else {
            await saveInteractiveDraft({
              definition,
              value: nextValue,
              content: {
                contentId: action.contentId,
                status: 'in_progress',
                contentVersion: action.contentVersion,
              },
            })
          }
          return
        }
        case 'salaryCalculator.reset': {
          await resetInteractive({
            definition: {
              id: action.interactionId,
              lessonId: action.contentId,
              kind: 'custom',
              scopePolicy: 'global',
              completionRule: { type: 'resolved' },
            },
          })
          return
        }
        case 'budgetAllocator.submit': {
          await resolveInteractive({
            definition: {
              id: action.interactionId,
              lessonId: action.contentId,
              kind: 'custom',
              scopePolicy: 'global',
              completionRule: { type: 'resolved' },
            },
            value: {
              kind: 'json',
              json: {
                value: {
                  allocations: action.allocations,
                  step: 'COMPARE',
                },
              },
            },
            outcome: null,
            score: 100,
            content: {
              contentId: action.contentId,
              status: 'completed',
              score: 100,
              contentVersion: action.contentVersion,
            },
          })
          return
        }
        case 'budgetAllocator.reset': {
          await resetInteractive({
            definition: {
              id: action.interactionId,
              lessonId: action.contentId,
              kind: 'custom',
              scopePolicy: 'global',
              completionRule: { type: 'resolved' },
            },
          })
          return
        }
        case 'budgetCycle.explore': {
          const definition: InteractiveDefinition = {
            id: action.interactionId,
            lessonId: action.contentId,
            kind: 'custom',
            scopePolicy: 'global',
            completionRule: { type: 'resolved' },
          }
          const existingRecord = getInteractiveRecordForDefinition(definition)
          const existingValue = existingRecord?.value?.kind === 'json'
            ? (existingRecord.value.json.value as Record<string, unknown>)
            : {}
          const existingExploredPhases = Array.isArray(existingValue.exploredPhases)
            ? existingValue.exploredPhases.filter((phaseId): phaseId is string => typeof phaseId === 'string')
            : []
          const exploredPhases = existingExploredPhases.includes(action.phaseId)
            ? existingExploredPhases
            : [...existingExploredPhases, action.phaseId]
          const allPhasesExplored = exploredPhases.length === 6
          const nextValue: InteractionValue = {
            kind: 'json',
            json: {
              value: {
                exploredPhases,
                lastExploredPhase: action.phaseId,
              },
            },
          }

          if (allPhasesExplored) {
            await resolveInteractive({
              definition,
              value: nextValue,
              outcome: null,
              score: Math.round((exploredPhases.length / 6) * 100),
              content: {
                contentId: action.contentId,
                status: 'completed',
                score: Math.round((exploredPhases.length / 6) * 100),
                contentVersion: action.contentVersion,
              },
            })
          } else {
            await saveInteractiveDraft({
              definition,
              value: nextValue,
              content: {
                contentId: action.contentId,
                status: 'in_progress',
                score: Math.round((exploredPhases.length / 6) * 100),
                contentVersion: action.contentVersion,
              },
            })
          }
          return
        }
        case 'budgetCycle.reset': {
          await resetInteractive({
            definition: {
              id: action.interactionId,
              lessonId: action.contentId,
              kind: 'custom',
              scopePolicy: 'global',
              completionRule: { type: 'resolved' },
            },
          })
          return
        }
        case 'uatFinder.select': {
          await saveInteractiveDraft({
            definition: {
              id: action.interactionId,
              lessonId: action.contentId,
              kind: 'custom',
              scopePolicy: 'global',
              completionRule: { type: 'resolved' },
            },
            value: {
              kind: 'json',
              json: {
                value: {
                  step: 'SELECTED',
                  selectedCui: action.cui,
                  selectedName: action.name,
                  exploredAction: null,
                },
              },
            },
            content: {
              contentId: action.contentId,
              status: 'in_progress',
              contentVersion: action.contentVersion,
            },
          })
          return
        }
        case 'uatFinder.explore': {
          const definition: InteractiveDefinition = {
            id: action.interactionId,
            lessonId: action.contentId,
            kind: 'custom',
            scopePolicy: 'global',
            completionRule: { type: 'resolved' },
          }
          const existingRecord = getInteractiveRecordForDefinition(definition)
          const existingValue = existingRecord?.value?.kind === 'json'
            ? (existingRecord.value.json.value as Record<string, unknown>)
            : {}
          await resolveInteractive({
            definition,
            value: {
              kind: 'json',
              json: {
                value: {
                  step: 'EXPLORED',
                  selectedCui: action.cui,
                  selectedName:
                    typeof existingValue.selectedName === 'string'
                      ? existingValue.selectedName
                      : null,
                  exploredAction: action.action,
                },
              },
            },
            outcome: null,
            content: {
              contentId: action.contentId,
              status: 'in_progress',
              contentVersion: action.contentVersion,
            },
          })
          return
        }
        case 'uatFinder.reset': {
          await resetInteractive({
            definition: {
              id: action.interactionId,
              lessonId: action.contentId,
              kind: 'custom',
              scopePolicy: 'global',
              completionRule: { type: 'resolved' },
            },
          })
          return
        }
        default: {
          const _exhaustive: never = action
          throw new Error(`Unhandled interaction action type: ${(_exhaustive as LearningInteractionAction).type}`)
        }
      }
    },
    [
      getInteractiveRecordForDefinition,
      resetInteractive,
      resolveInteractive,
      saveInteractiveDraft,
    ],
  )

  const saveOnboarding = useCallback(
    async (input: SaveOnboardingInput) => {
      if (!input.pathId.trim()) throw new Error(t`Missing path id`)
      const occurredAt = nowIso()
      const currentRecords = progressRef.current.interactiveState.recordsByKey
      const existingOnboardingRecord = currentRecords[SYSTEM_LEARNING_ONBOARDING_RECORD_KEY]
      const existingActivePathRecord = currentRecords[SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY]
      const events: LearningProgressEvent[] = [
        createInteractiveUpdatedEvent({
          record: createLearningOnboardingRecord({
            pathId: input.pathId,
            relatedPaths: input.relatedPaths ?? [],
            completedAt: occurredAt,
            updatedAt: getNextTimestamp(existingOnboardingRecord?.updatedAt ?? occurredAt),
          }),
        }),
        createInteractiveUpdatedEvent({
          record: createLearningActivePathRecord({
            pathId: input.pathId,
            updatedAt: getNextTimestamp(existingActivePathRecord?.updatedAt ?? occurredAt),
          }),
        }),
      ]

      const keys = getStorageKeys()
      if (isBootstrappingRef.current) {
        queuedEventsRef.current.push(...events)
        setProgress((current) => events.reduce(
          (currentSnapshot, event) => applyLearningProgressEvent(currentSnapshot, event),
          current,
        ))
        for (const event of events) {
          updateSyncEntry(event.eventId, (entry) => ({
            ...entry,
            status: 'local',
          }))
        }
        return
      }

      appendEvents(events, { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey })
    },
    [appendEvents, createInteractiveUpdatedEvent, getStorageKeys, updateSyncEntry],
  )

  const setActivePathId = useCallback(
    async (pathId: string | null) => {
      const event = createInteractiveUpdatedEvent({
        record: createLearningActivePathRecord({
          pathId,
          updatedAt: getNextTimestamp(
            progressRef.current.interactiveState.recordsByKey[SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY]?.updatedAt,
          ),
        }),
      })

      const keys = getStorageKeys()
      if (isBootstrappingRef.current) {
        queuedEventsRef.current.push(event)
        setProgress((current) => applyLearningProgressEvent(current, event))
        updateSyncEntry(event.eventId, (entry) => ({
          ...entry,
          status: 'local',
        }))
        return
      }

      appendEvents([event], { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey })
    },
    [appendEvents, createInteractiveUpdatedEvent, getStorageKeys, updateSyncEntry],
  )

  const resetOnboarding = useCallback(async () => {
    const occurredAt = nowIso()
    const currentRecords = progressRef.current.interactiveState.recordsByKey
    const existingOnboardingRecord = currentRecords[SYSTEM_LEARNING_ONBOARDING_RECORD_KEY]
    const existingActivePathRecord = currentRecords[SYSTEM_LEARNING_ACTIVE_PATH_RECORD_KEY]
    const events: LearningProgressEvent[] = [
      createInteractiveUpdatedEvent({
        record: createLearningOnboardingRecord({
          pathId: null,
          relatedPaths: [],
          completedAt: null,
          updatedAt: getNextTimestamp(existingOnboardingRecord?.updatedAt ?? occurredAt),
        }),
      }),
      createInteractiveUpdatedEvent({
        record: createLearningActivePathRecord({
          pathId: null,
          updatedAt: getNextTimestamp(existingActivePathRecord?.updatedAt ?? occurredAt),
        }),
      }),
    ]

    const keys = getStorageKeys()
    if (isBootstrappingRef.current) {
      queuedEventsRef.current.push(...events)
      setProgress((current) => events.reduce(
        (currentSnapshot, event) => applyLearningProgressEvent(currentSnapshot, event),
        current,
      ))
      for (const event of events) {
        updateSyncEntry(event.eventId, (entry) => ({
          ...entry,
          status: 'local',
        }))
      }
      return
    }

    appendEvents(events, { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey })
  }, [appendEvents, createInteractiveUpdatedEvent, getStorageKeys, updateSyncEntry])

  const getContentProgress = useCallback(
    (contentId: string) => {
      return progress.content[contentId]
    },
    [progress.content],
  )

  const clearProgress = useCallback(() => {
    const event: LearningProgressEvent = {
      eventId: createEventId(),
      occurredAt: nowIso(),
      clientId: getClientId(),
      type: 'progress.reset',
    }

    const keys = getStorageKeys()
    if (isBootstrappingRef.current) {
      queuedEventsRef.current = [event]
      removeSyncEntries(Object.keys(syncStateRef.current.events))
      setProgress((current) => applyLearningProgressEvent(current, event))
      updateSyncEntry(event.eventId, (entry) => ({
        ...entry,
        status: 'local',
      }))
      return
    }

    appendEvents(
      [event],
      { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey },
      { replacePending: true },
    )
  }, [appendEvents, getClientId, getStorageKeys, removeSyncEntries, updateSyncEntry])

  const value = useMemo<LearningProgressContextValue>(
    () => ({
      isReady,
      bootstrapPhase,
      auth,
      progress,
      getContentProgress,
      getInteractiveRecord: getInteractiveRecordForDefinition,
      getInteractiveAuditLog: getInteractiveAuditLogForRecord,
      saveContentProgress,
      saveInteractiveDraft,
      submitInteractive,
      resolveInteractive,
      applyInteractiveEvaluation,
      resetInteractive,
      dispatchInteractionAction,
      saveOnboarding,
      setActivePathId,
      resetOnboarding,
      sync: syncNow,
      clearProgress,
    }),
    [
      isReady,
      bootstrapPhase,
      auth,
      progress,
      getContentProgress,
      getInteractiveRecordForDefinition,
      getInteractiveAuditLogForRecord,
      saveContentProgress,
      saveInteractiveDraft,
      submitInteractive,
      resolveInteractive,
      applyInteractiveEvaluation,
      resetInteractive,
      dispatchInteractionAction,
      saveOnboarding,
      setActivePathId,
      resetOnboarding,
      syncNow,
      clearProgress,
    ],
  )

  return <LearningProgressContext.Provider value={value}>{children}</LearningProgressContext.Provider>
}

export function useLearningProgress() {
  const ctx = useContext(LearningProgressContext)
  if (!ctx) throw new Error('useLearningProgress must be used within <LearningProgressProvider>')
  return ctx
}
