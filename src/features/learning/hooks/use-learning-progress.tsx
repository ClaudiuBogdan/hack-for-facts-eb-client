import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { useAuth } from '@/lib/auth'
import { fetchLearningProgress, syncLearningProgressEvents } from '../api/progress'
import { getEmptyLearningGuestProgress } from '../schemas/progress'
import { parseLearningProgressEvents } from '../schemas/progress-events'
import { applyLearningProgressEvent, reduceLearningProgressEvents } from '../utils/progress-event-reducer'
import { resolveInteractionAction, type SaveContentProgressInput } from './interactions/interaction-resolver'
import type {
  LearningAuthState,
  LearningContentProgress,
  LearningGuestProgress,
  LearningInteractionAction,
  LearningProgressEvent,
} from '../types'

// Import resolvers to register them
import './interactions/quiz-resolver'
import './interactions/prediction-resolver'
import './interactions/salary-calculator-resolver'
import './interactions/budget-allocator-resolver'

const GUEST_EVENTS_KEY = 'learning_progress_events'
const GUEST_SNAPSHOT_KEY = 'learning_progress_snapshot'
const CLIENT_ID_KEY = 'learning_progress_client_id'

const MAX_RETRIES = 4
const RETRY_DELAYS = [1000, 5000, 15000, 60000]
const SYNC_DEBOUNCE_MS = 1200

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

function clampScore(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Math.max(0, Math.min(100, value))
}

type SaveOnboardingInput = {
  readonly pathId: string
  readonly relatedPaths?: readonly string[]
}

type LearningProgressContextValue = {
  readonly isReady: boolean
  readonly isSyncedWithAuthState: boolean
  readonly auth: LearningAuthState
  readonly progress: LearningGuestProgress
  readonly getContentProgress: (contentId: string) => LearningContentProgress | undefined
  readonly saveContentProgress: (input: SaveContentProgressInput) => Promise<void>
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

  const persistSyncState = useCallback(
    (syncKey: string | null) => {
      if (!syncKey) return
      safeWriteToStorage(syncKey, syncStateRef.current)
    },
    [safeWriteToStorage],
  )

  const recomputeSnapshot = useCallback(
    (events: LearningProgressEvent[], snapshotKey: string | null) => {
      const nextSnapshot = reduceLearningProgressEvents(events)
      if (snapshotKey) {
        saveSnapshotForKey(snapshotKey, nextSnapshot)
      }
      setProgress(nextSnapshot)
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
    recomputeSnapshot(events, keys.snapshotKey)
  }, [getStorageKeys, loadEventsForKey, recomputeSnapshot])

  const applyRemoteProgress = useCallback(
    (remote: RemoteLearningProgress, keys: { eventsKey: string; snapshotKey: string; syncKey: string | null }) => {
      if (remote.cursor) {
        syncStateRef.current = {
          ...syncStateRef.current,
          lastSyncedCursor: remote.cursor,
        }
      }

      if (remote.events.length > 0) {
        const merged = mergeEventLogs(eventsRef.current, remote.events)
        if (merged.length !== eventsRef.current.length) {
          eventsRef.current = merged
          safeWriteToStorage(keys.eventsKey, merged)
          recomputeSnapshot(merged, keys.snapshotKey)
        }

        const syncedAt = nowIso()
        for (const event of remote.events) {
          updateSyncEntry(event.eventId, (entry) => ({
            ...entry,
            status: 'synced',
            lastSyncedAt: entry.lastSyncedAt ?? syncedAt,
          }))
        }
      }

      persistSyncState(keys.syncKey)
    },
    [persistSyncState, recomputeSnapshot, safeWriteToStorage, updateSyncEntry],
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
      for (const event of pendingEvents) {
        updateSyncEntry(event.eventId, (entry) => ({
          ...entry,
          status: 'synced',
          lastSyncedAt: attemptAt,
        }))
      }
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
    refetchRemoteProgress,
    recomputeFromStorage,
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

  const appendEvent = useCallback(
    (event: LearningProgressEvent, storageKeys: { eventsKey: string; snapshotKey: string; syncKey: string | null }) => {
      const nextEvents = [...eventsRef.current, event]
      eventsRef.current = nextEvents
      const eventsWritten = safeWriteToStorage(storageKeys.eventsKey, nextEvents)

      updateSyncEntry(event.eventId, (entry) => ({
        ...entry,
        status: eventsWritten ? 'local' : 'error',
        retryCount: entry.retryCount ?? 0,
        errorMessage: eventsWritten ? entry.errorMessage : 'localStorage quota exceeded',
      }))
      if (storageKeys.syncKey) {
        persistSyncState(storageKeys.syncKey)
      }

      setProgress((current) => {
        const nextSnapshot = applyLearningProgressEvent(current, event)
        saveSnapshotForKey(storageKeys.snapshotKey, nextSnapshot)
        return nextSnapshot
      })

      queueSync()
    },
    [persistSyncState, queueSync, safeWriteToStorage, saveSnapshotForKey, updateSyncEntry],
  )

  useEffect(() => {
    if (!isLoaded) {
      // Load guest progress immediately so UI renders without waiting for auth
      const guestEvents = loadEventsForKey(GUEST_EVENTS_KEY)
      eventsRef.current = guestEvents
      recomputeSnapshot(guestEvents, null)
      setIsReady(true)
      setIsSyncedWithAuthState(false)
      return
    }

    const keys = getStorageKeys()

    if (!auth.isAuthenticated || !auth.userId) {
      eventsRef.current = loadEventsForKey(keys.eventsKey)
      recomputeSnapshot(eventsRef.current, keys.snapshotKey)
      setIsReady(true)
      setIsSyncedWithAuthState(true)
      return
    }

    const bootstrap = async () => {
      isBootstrappingRef.current = true
      queuedEventsRef.current = []

      const guestEvents = loadEventsForKey(GUEST_EVENTS_KEY)
      const localEvents = loadEventsForKey(keys.eventsKey)
      const localSync = parseSyncState(readJsonFromStorage(keys.syncKey ?? ''))
      syncStateRef.current = localSync

      let remoteEvents: LearningProgressEvent[] = []
      let remoteSnapshot = null as LearningGuestProgress | null
      let remoteCursor: string | null = null
      try {
        const remote = await fetchLearningProgress()
        queryClient.setQueryData(progressQueryKey, remote)
        remoteEvents = remote.events
        remoteSnapshot = remote.snapshot
        remoteCursor = remote.cursor ?? null
      } catch (error) {
        console.warn('Failed to fetch remote learning progress:', error)
      }

      if (remoteEvents.length === 0 && remoteSnapshot) {
        const hasRemoteData =
          Object.keys(remoteSnapshot.content).length > 0 ||
          remoteSnapshot.onboarding.completedAt !== null ||
          remoteSnapshot.onboarding.pathId !== null ||
          remoteSnapshot.activePathId !== null
        if (hasRemoteData) {
          console.warn('Remote progress snapshot has data but events array is empty. Server must return events.')
        }
      }

      const remoteEventIds = new Set(remoteEvents.map((event) => event.eventId))
      const mergedEvents = mergeEventLogs(guestEvents, localEvents, remoteEvents)
      let nextSnapshot = reduceLearningProgressEvents(mergedEvents)

      if (queuedEventsRef.current.length > 0) {
        for (const queuedEvent of queuedEventsRef.current) {
          nextSnapshot = applyLearningProgressEvent(nextSnapshot, queuedEvent)
        }
        mergedEvents.push(...queuedEventsRef.current)
        queuedEventsRef.current = []
      }

      eventsRef.current = mergedEvents
      saveSnapshotForKey(keys.snapshotKey, nextSnapshot)
      safeWriteToStorage(keys.eventsKey, mergedEvents)
      setProgress(nextSnapshot)

      for (const event of mergedEvents) {
        if (remoteEventIds.has(event.eventId)) {
          updateSyncEntry(event.eventId, (entry) => ({
            ...entry,
            status: 'synced',
            lastSyncedAt: entry.lastSyncedAt ?? nowIso(),
          }))
        }
      }
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
    recomputeSnapshot,
    saveSnapshotForKey,
    safeWriteToStorage,
    updateSyncEntry,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let storageDebounceTimeout: number | null = null
    const handler = (event: StorageEvent) => {
      if (event.key?.startsWith('learning_progress_events')) {
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

  const saveContentProgress = useCallback(
    async (input: SaveContentProgressInput) => {
      if (!input.contentId.trim()) throw new Error(t`Missing content id`)

      const event: LearningProgressEvent = {
        eventId: createEventId(),
        occurredAt: nowIso(),
        clientId: getClientId(),
        type: 'content.progressed',
        payload: {
          contentId: input.contentId,
          status: input.status,
          score: clampScore(input.score),
          contentVersion: input.contentVersion,
          interaction: input.interaction,
        },
      }

      if (isBootstrappingRef.current) {
        queuedEventsRef.current.push(event)
        setProgress((current) => applyLearningProgressEvent(current, event))
        updateSyncEntry(event.eventId, (entry) => ({
          ...entry,
          status: 'local',
        }))
        return
      }

      const keys = getStorageKeys()
      appendEvent(event, { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey })
    },
    [appendEvent, getClientId, getStorageKeys, updateSyncEntry],
  )

  const dispatchInteractionAction = useCallback(
    async (action: LearningInteractionAction) => {
      const context = { progress, nowIso }
      const resolved = resolveInteractionAction(action, context)
      await saveContentProgress(resolved)
    },
    [progress, saveContentProgress],
  )

  const saveOnboarding = useCallback(
    async (input: SaveOnboardingInput) => {
      if (!input.pathId.trim()) throw new Error(t`Missing path id`)

      const event: LearningProgressEvent = {
        eventId: createEventId(),
        occurredAt: nowIso(),
        clientId: getClientId(),
        type: 'onboarding.completed',
        payload: { pathId: input.pathId, relatedPaths: input.relatedPaths ?? [] },
      }

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

      appendEvent(event, { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey })
    },
    [appendEvent, getClientId, getStorageKeys, updateSyncEntry],
  )

  const setActivePathId = useCallback(
    async (pathId: string | null) => {
      const event: LearningProgressEvent = {
        eventId: createEventId(),
        occurredAt: nowIso(),
        clientId: getClientId(),
        type: 'activePath.set',
        payload: { pathId },
      }

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

      appendEvent(event, { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey })
    },
    [appendEvent, getClientId, getStorageKeys, updateSyncEntry],
  )

  const resetOnboarding = useCallback(async () => {
    const event: LearningProgressEvent = {
      eventId: createEventId(),
      occurredAt: nowIso(),
      clientId: getClientId(),
      type: 'onboarding.reset',
    }

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

    appendEvent(event, { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey })
  }, [appendEvent, getClientId, getStorageKeys, updateSyncEntry])

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
      queuedEventsRef.current.push(event)
      setProgress((current) => applyLearningProgressEvent(current, event))
      updateSyncEntry(event.eventId, (entry) => ({
        ...entry,
        status: 'local',
      }))
      return
    }

    appendEvent(event, { eventsKey: keys.eventsKey, snapshotKey: keys.snapshotKey, syncKey: keys.syncKey })
  }, [appendEvent, getClientId, getStorageKeys, updateSyncEntry])

  const value = useMemo<LearningProgressContextValue>(
    () => ({
      isReady,
      isSyncedWithAuthState,
      auth,
      progress,
      getContentProgress,
      saveContentProgress,
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
      saveContentProgress,
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
