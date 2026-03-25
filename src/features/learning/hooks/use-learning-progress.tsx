import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { useAuth } from '@/lib/auth'
import { fetchLearningProgress, syncLearningProgressEvents } from '../api/progress'
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
  projectLearningGuestProgress,
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
import type {
  InteractiveAuditEvent,
  InteractiveDefinition,
  InteractiveStateRecord,
  InteractionOutcome,
  InteractionValue,
  LearningAuthState,
  LearningContentProgress,
  LearningGuestProgress,
  LearningInteractionAction,
  LearningProgressEvent,
  LearningProgressRemoteSnapshot,
} from '../types'

const GUEST_EVENTS_KEY = 'learning_progress_events'
const GUEST_SNAPSHOT_KEY = 'learning_progress_snapshot'
const CLIENT_ID_KEY = 'learning_progress_client_id'

const MAX_RETRIES = 4
const RETRY_DELAYS = [1000, 5000, 15000, 60000]
const SYNC_DEBOUNCE_MS = 1200
const REMOTE_REFRESH_INTERVAL_MS = 15000

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

function readJsonFromStorage(key: string): unknown {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
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

type LearningProgressContextValue = {
  readonly isReady: boolean
  readonly isSyncedWithAuthState: boolean
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

type LearningSyncStatus = 'synced' | 'local' | 'syncing' | 'error'

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

function projectRemoteSnapshot(snapshot: LearningProgressRemoteSnapshot): LearningGuestProgress {
  return projectLearningGuestProgress({
    interactiveState: {
      recordsByKey: snapshot.recordsByKey,
      eventLogByRecordKey: {},
    },
    lastUpdated: snapshot.lastUpdated,
  })
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
  const queryClient = useQueryClient()

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
  const [isSyncedWithAuthState, setIsSyncedWithAuthState] = useState(false)

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

  const getClientId = useCallback((): string => {
    if (clientIdRef.current) return clientIdRef.current
    const stored = readJsonFromStorage(CLIENT_ID_KEY)
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

  const safeWriteToStorage = useCallback((key: string, value: unknown): boolean => {
    if (storageBlockedRef.current || typeof window === 'undefined') return false
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
  }, [])

  const loadEventsForKey = useCallback((eventsKey: string): LearningProgressEvent[] => {
    const rawEvents = readJsonFromStorage(eventsKey)
    return parseLearningProgressEvents(rawEvents)
  }, [])

  const loadSnapshotForKey = useCallback((snapshotKey: string): LearningGuestProgress | null => {
    const rawSnapshot = readJsonFromStorage(snapshotKey)
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
    enabled: auth.isAuthenticated && isSyncedWithAuthState,
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
    if (!isSyncedWithAuthState || !auth.isAuthenticated || !progressQuery.data) return
    const keys = getStorageKeys()
    applyRemoteProgress(progressQuery.data, keys)
  }, [applyRemoteProgress, auth.isAuthenticated, getStorageKeys, isSyncedWithAuthState, progressQuery.data])

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
      void syncNowRef.current()
    }, SYNC_DEBOUNCE_MS)
  }, [auth.isAuthenticated])

  const scheduleRetry = useCallback((delay: number) => {
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current)
    }
    retryTimeoutRef.current = window.setTimeout(() => {
      void syncNowRef.current()
    }, delay)
  }, [])

  const syncNow = useCallback(async () => {
    if (isBootstrappingRef.current) return
    if (!auth.isAuthenticated || !auth.userId) {
      recomputeFromStorage()
      return
    }
    if (syncInFlightRef.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return

    const syncKey = getAuthSyncKey(auth.userId)
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
    const attemptAt = nowIso()

    for (const event of pendingEvents) {
      updateSyncEntry(event.eventId, (entry) => ({
        ...entry,
        status: 'syncing',
        lastAttemptAt: attemptAt,
      }))
    }
    persistSyncState(syncKey)

    try {
      await syncLearningProgressEvents({ events: pendingEvents, clientUpdatedAt: attemptAt })
      const syncedEventIds = new Set(pendingEvents.map((event) => event.eventId))
      eventsRef.current = eventsRef.current.filter((event) => !syncedEventIds.has(event.eventId))
      safeWriteToStorage(getAuthEventsKey(auth.userId), eventsRef.current)
      removeSyncEntries([...syncedEventIds])
      syncStateRef.current = {
        ...syncStateRef.current,
        lastSuccessfulSyncAt: attemptAt,
      }
      persistSyncState(syncKey)

      if (pendingGuestCleanupRef.current) {
        removeFromStorage(GUEST_EVENTS_KEY)
        removeFromStorage(GUEST_SNAPSHOT_KEY)
        pendingGuestCleanupRef.current = false
      }

      await refetchRemoteProgress()
    } catch (error) {
      for (const event of pendingEvents) {
        updateSyncEntry(event.eventId, (entry) => ({
          ...entry,
          status: 'error',
          retryCount: entry.retryCount + 1,
          errorMessage: error instanceof Error ? error.message : 'Sync failed',
        }))
      }
      persistSyncState(syncKey)
      const maxRetry = pendingEvents.reduce((max, event) => {
        const entry = syncStateRef.current.events[event.eventId]
        return Math.max(max, entry?.retryCount ?? 0)
      }, 0)
      if (maxRetry <= MAX_RETRIES) {
        const delay = RETRY_DELAYS[Math.min(maxRetry, RETRY_DELAYS.length - 1)]
        scheduleRetry(delay)
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

      const nextEvents = options?.replacePending
        ? [...events]
        : [...eventsRef.current, ...events]
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

      setProgress((current) => {
        const baseSnapshot = options?.replacePending ? getEmptyLearningGuestProgress() : current
        const nextSnapshot = events.reduce(
          (currentSnapshot, event) => applyLearningProgressEvent(currentSnapshot, event),
          baseSnapshot,
        )
        saveSnapshotForKey(storageKeys.snapshotKey, nextSnapshot)
        return nextSnapshot
      })

      queueSync()
    },
    [persistSyncState, queueSync, removeSyncEntries, safeWriteToStorage, saveSnapshotForKey, updateSyncEntry],
  )

  useEffect(() => {
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
      setIsSyncedWithAuthState(false)
      return
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
      setIsSyncedWithAuthState(true)
      return
    }

    const bootstrap = async () => {
      isBootstrappingRef.current = true
      queuedEventsRef.current = []

      const guestEvents = loadEventsForKey(GUEST_EVENTS_KEY)
      const localEvents = loadEventsForKey(keys.eventsKey)
      const guestSnapshot = loadSnapshotForKey(GUEST_SNAPSHOT_KEY)
      const localSnapshot = loadSnapshotForKey(keys.snapshotKey)
      const localSync = parseSyncState(readJsonFromStorage(keys.syncKey ?? ''))
      syncStateRef.current = localSync

      let remoteSnapshot = projectRemoteSnapshot({
        version: 1,
        recordsByKey: {},
        lastUpdated: null,
      })
      let remoteCursor: string | null = null
      try {
        const remote = await fetchLearningProgress()
        queryClient.setQueryData(progressQueryKey, remote)
        remoteSnapshot = projectRemoteSnapshot(remote.snapshot)
        remoteCursor = remote.cursor ?? null
      } catch (error) {
        console.warn('Failed to fetch remote learning progress:', error)
      }

      const mergedPendingEvents = mergeEventLogs(guestEvents, localEvents)
      let nextSnapshot = mergeLearningGuestProgress(
        mergeLearningGuestProgress(
          guestSnapshot ?? getEmptyLearningGuestProgress(),
          localSnapshot ?? getEmptyLearningGuestProgress(),
        ),
        remoteSnapshot,
      )

      if (queuedEventsRef.current.length > 0) {
        mergedPendingEvents.push(...queuedEventsRef.current)
        queuedEventsRef.current = []
      }

      if (mergedPendingEvents.length > 0) {
        nextSnapshot = applyEventsToSnapshot(nextSnapshot, mergedPendingEvents, null)
      }

      eventsRef.current = mergedPendingEvents
      safeWriteToStorage(keys.eventsKey, mergedPendingEvents)
      saveSnapshotForKey(keys.snapshotKey, nextSnapshot)
      setProgress(nextSnapshot)

      if (remoteCursor) {
        syncStateRef.current = {
          ...syncStateRef.current,
          lastSyncedCursor: remoteCursor,
        }
      }
      persistSyncState(keys.syncKey)

      if (guestEvents.length > 0) {
        pendingGuestCleanupRef.current = true
      }

      isBootstrappingRef.current = false
      setIsReady(true)
      setIsSyncedWithAuthState(true)
      queueSync()
    }

    setIsSyncedWithAuthState(false)
    void bootstrap()
  }, [
    auth.isAuthenticated,
    auth.userId,
    getStorageKeys,
    isLoaded,
    loadEventsForKey,
    persistSyncState,
    progressQueryKey,
    queryClient,
    queueSync,
    applyEventsToSnapshot,
    saveSnapshotForKey,
    safeWriteToStorage,
    updateSyncEntry,
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

      await appendInteractiveUpdateEvent({
        record: nextRecord,
        content: input.content,
      })
      return nextRecord
    },
    [appendInteractiveUpdateEvent, getInteractiveRecordForDefinition],
  )

  const submitInteractive = useCallback(
    async (input: SubmitInteractiveInput): Promise<InteractiveStateRecord | null> => {
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

      const auditEvent: InteractiveAuditEvent = {
        id: createEventId(),
        recordKey: nextRecord.key,
        lessonId: nextRecord.lessonId,
        interactionId: nextRecord.interactionId,
        type: 'submitted',
        at: submittedAt,
        actor: 'user',
        value: nextValue,
      }

      await appendInteractiveUpdateEvent({
        record: nextRecord,
        auditEvents: [auditEvent],
        content: input.content,
      })

      return nextRecord
    },
    [appendInteractiveUpdateEvent, getInteractiveRecordForDefinition],
  )

  const resolveInteractive = useCallback(
    async (input: ResolveInteractiveInput): Promise<InteractiveStateRecord | null> => {
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

      const auditEvents: InteractiveAuditEvent[] = [
        {
          id: createEventId(),
          recordKey: nextRecord.key,
          lessonId: nextRecord.lessonId,
          interactionId: nextRecord.interactionId,
          type: 'submitted',
          at: updatedAt,
          actor: 'user',
          value: nextValue,
        },
        {
          id: createEventId(),
          recordKey: nextRecord.key,
          lessonId: nextRecord.lessonId,
          interactionId: nextRecord.interactionId,
          type: 'evaluated',
          at: updatedAt,
          actor: 'system',
          phase,
          result,
        },
      ]

      await appendInteractiveUpdateEvent({
        record: nextRecord,
        auditEvents,
        content: input.content,
      })

      return nextRecord
    },
    [appendInteractiveUpdateEvent, getInteractiveRecordForDefinition],
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

      const auditEvent: InteractiveAuditEvent = {
        id: createEventId(),
        recordKey: nextRecord.key,
        lessonId: nextRecord.lessonId,
        interactionId: nextRecord.interactionId,
        type: 'evaluated',
        at: evaluatedAt,
        actor: 'system',
        phase,
        result,
      }

      await appendInteractiveUpdateEvent({
        record: nextRecord,
        auditEvents: [auditEvent],
        content: input.content,
      })

      return nextRecord
    },
    [appendInteractiveUpdateEvent, progress.interactiveState.recordsByKey],
  )

  const resetInteractive = useCallback(
    async (input: ResetInteractiveInput): Promise<InteractiveStateRecord | null> => {
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

      await appendInteractiveUpdateEvent({ record: nextRecord })
      return nextRecord
    },
    [appendInteractiveUpdateEvent, getInteractiveRecordForDefinition],
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
      isSyncedWithAuthState,
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
      isSyncedWithAuthState,
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
