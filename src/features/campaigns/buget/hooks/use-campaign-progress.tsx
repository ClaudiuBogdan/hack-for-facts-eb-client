import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { parseLearningProgressEvents } from '@/features/learning/schemas/progress-events'
import type {
  InteractiveAuditEvent,
  InteractiveStateRecord,
  LearningProgressEvent,
} from '@/features/learning/types'
import { useAuth } from '@/lib/auth'
import { CAMPAIGN_ID, CAMPAIGN_PROGRESS_STORAGE_KEY } from '../constants'
import { fetchCampaignProgress, syncCampaignProgress } from '../api/campaign-progress'
import { getEmptyCampaignProgressSnapshot, parseCampaignProgressSnapshot } from '../schemas/progress-schema'
import {
  CAMPAIGN_ACCEPTED_TERMS_RECORD_KEY,
  CAMPAIGN_ACTIVE_MODULE_RECORD_KEY,
  CAMPAIGN_ONBOARDING_RECORD_KEY,
  CAMPAIGN_SELECTED_ENTITY_RECORD_KEY,
  applyCampaignProgressEventsToRecords,
  createCampaignAcceptedTermsRecord,
  buildCampaignProgressRecords,
  createCampaignActiveModuleRecord,
  createCampaignChallengeRecord,
  createCampaignOnboardingRecord,
  createCampaignSelectedEntityRecord,
  diffCampaignProgressRecords,
  filterCampaignProgressEvents,
  mergeCampaignProgressRecords,
  projectCampaignProgressFromRecords,
} from '../utils/progress-records'
import type { CampaignChallengeStatus, CampaignProgressSnapshot } from '../types'

type CampaignProgressContextValue = {
  readonly isReady: boolean
  readonly isInitialResolutionReady: boolean
  readonly isSyncing: boolean
  readonly progress: CampaignProgressSnapshot
  readonly localSelectedEntityCui: string | null
  readonly remoteSelectedEntityCui: string | null
  readonly getChallengeStatus: (challengeSlug: string) => CampaignChallengeStatus
  readonly setChallengeStatus: (
    challengeSlug: string,
    status: CampaignChallengeStatus,
    options?: {
      readonly attempts?: number
      readonly incrementAttempts?: boolean
      readonly emitAuditEvent?: boolean
    },
  ) => void
  readonly setSelectedEntity: (input: { entityCui: string }) => void
  readonly setActiveChallengeModule: (input: { moduleSlug: string | null }) => void
  readonly markChallengeInProgress: (challengeSlug: string) => void
  readonly completeOnboarding: (input: { locality: string }) => void
  readonly acceptChallengeTerms: (input?: { acceptedTermsAt?: string }) => void
  readonly resetAcceptedChallengeTerms: () => void
  readonly resetProgress: () => void
  readonly sync: () => Promise<void>
}

type CampaignProgressSyncState = {
  version: 1
  lastSuccessfulSyncAt: string | null
  lastSyncedCursor: string | null
}

const CAMPAIGN_PROGRESS_EVENTS_STORAGE_KEY = `campaign_progress_events:${CAMPAIGN_ID}`
const CAMPAIGN_PROGRESS_SYNC_STORAGE_KEY = `campaign_progress_sync:${CAMPAIGN_ID}`
const CAMPAIGN_PROGRESS_CLIENT_ID_STORAGE_KEY = `campaign_progress_client_id:${CAMPAIGN_ID}`
const SYNC_DEBOUNCE_MS = 1200

const CampaignProgressContext = createContext<CampaignProgressContextValue | null>(null)

function getAuthSnapshotKey(userId: string): string {
  return `${CAMPAIGN_PROGRESS_STORAGE_KEY}:${userId}`
}

function getAuthEventsKey(userId: string): string {
  return `${CAMPAIGN_PROGRESS_EVENTS_STORAGE_KEY}:${userId}`
}

function getAuthSyncKey(userId: string): string {
  return `${CAMPAIGN_PROGRESS_SYNC_STORAGE_KEY}:${userId}`
}

function getEmptySyncState(): CampaignProgressSyncState {
  return {
    version: 1,
    lastSuccessfulSyncAt: null,
    lastSyncedCursor: null,
  }
}

function parseSyncState(raw: unknown): CampaignProgressSyncState {
  if (!raw || typeof raw !== 'object') {
    return getEmptySyncState()
  }

  const record = raw as Partial<CampaignProgressSyncState>
  return {
    version: 1,
    lastSuccessfulSyncAt: typeof record.lastSuccessfulSyncAt === 'string' ? record.lastSuccessfulSyncAt : null,
    lastSyncedCursor: typeof record.lastSyncedCursor === 'string' ? record.lastSyncedCursor : null,
  }
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

function writeJsonToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to persist campaign progress to localStorage.', error)
  }
}

function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key)
}

function loadSnapshotForKey(snapshotKey: string): CampaignProgressSnapshot | null {
  const rawSnapshot = readJsonFromStorage(snapshotKey)
  if (!rawSnapshot) {
    return null
  }

  try {
    return parseCampaignProgressSnapshot(rawSnapshot)
  } catch {
    return null
  }
}

function loadEventsForKey(eventsKey: string): LearningProgressEvent[] {
  return filterCampaignProgressEvents(parseLearningProgressEvents(readJsonFromStorage(eventsKey)))
}

function isClearedCampaignRecord(record: InteractiveStateRecord): boolean {
  if (record.value?.kind !== 'json') {
    return record.value === null
  }

  const payload = record.value.json.value

  if (record.key === CAMPAIGN_ONBOARDING_RECORD_KEY) {
    return payload.completedAt === null && payload.locality === null
  }

  if (record.key === CAMPAIGN_ACCEPTED_TERMS_RECORD_KEY) {
    return payload.acceptedTermsAt === null
  }

  if (record.key === CAMPAIGN_SELECTED_ENTITY_RECORD_KEY) {
    return payload.entityCui === null
  }

  if (record.key === CAMPAIGN_ACTIVE_MODULE_RECORD_KEY) {
    return payload.moduleSlug === null
  }

  if (record.key.startsWith(`system:campaign:${CAMPAIGN_ID}:challenge:`)) {
    return payload.status === 'not_started' && payload.attempts === 0
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

function createEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `campaign-event-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function mergeEventLogs(...logs: readonly (readonly LearningProgressEvent[])[]): LearningProgressEvent[] {
  const eventsById = new Map<string, LearningProgressEvent>()

  for (const log of logs) {
    for (const event of log) {
      if (!eventsById.has(event.eventId)) {
        eventsById.set(event.eventId, event)
      }
    }
  }

  return Array.from(eventsById.values()).sort((leftEvent, rightEvent) => {
    if (leftEvent.occurredAt !== rightEvent.occurredAt) {
      return leftEvent.occurredAt.localeCompare(rightEvent.occurredAt)
    }

    return leftEvent.eventId.localeCompare(rightEvent.eventId)
  })
}

function hasProgressData(snapshot: CampaignProgressSnapshot | null): boolean {
  if (!snapshot) {
    return false
  }

  return snapshot.onboardingCompletedAt !== null
    || snapshot.acceptedTermsAt !== null
    || snapshot.selectedLocality !== null
    || snapshot.selectedEntityCui !== null
    || snapshot.activeChallengeModuleSlug !== null
    || Object.keys(snapshot.challenges).length > 0
}

function getRecordUpdatedAt(snapshot: CampaignProgressSnapshot, recordKey: string): string | null {
  if (recordKey === CAMPAIGN_ONBOARDING_RECORD_KEY) {
    return snapshot.onboardingCompletedAt ?? snapshot.lastUpdated
  }

  if (recordKey === CAMPAIGN_ACCEPTED_TERMS_RECORD_KEY) {
    return snapshot.acceptedTermsAt ?? snapshot.lastUpdated
  }

  if (recordKey === CAMPAIGN_SELECTED_ENTITY_RECORD_KEY || recordKey === CAMPAIGN_ACTIVE_MODULE_RECORD_KEY) {
    return snapshot.lastUpdated
  }

  const challengePrefix = `system:campaign:${CAMPAIGN_ID}:challenge:`
  if (recordKey.startsWith(challengePrefix)) {
    const challengeSlug = recordKey.slice(challengePrefix.length)
    return snapshot.challenges[challengeSlug]?.updatedAt ?? snapshot.lastUpdated
  }

  return snapshot.lastUpdated
}

function applyEventsToSnapshot(
  baseSnapshot: CampaignProgressSnapshot,
  events: readonly LearningProgressEvent[],
): CampaignProgressSnapshot {
  const nextRecords = applyCampaignProgressEventsToRecords(
    buildCampaignProgressRecords(baseSnapshot),
    events,
  )

  return projectCampaignProgressFromRecords(nextRecords, baseSnapshot.lastUpdated)
}

export function CampaignProgressProvider({ children }: { readonly children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useAuth()

  const [progress, setProgress] = useState<CampaignProgressSnapshot>(() => getEmptyCampaignProgressSnapshot())
  const [isReady, setIsReady] = useState(false)
  const [isInitialResolutionReady, setIsInitialResolutionReady] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [localSelectedEntityCui, setLocalSelectedEntityCui] = useState<string | null>(null)
  const [remoteSelectedEntityCui, setRemoteSelectedEntityCui] = useState<string | null>(null)

  const progressRef = useRef(progress)
  progressRef.current = progress

  const eventsRef = useRef<LearningProgressEvent[]>([])
  const syncStateRef = useRef<CampaignProgressSyncState>(getEmptySyncState())
  const clientIdRef = useRef<string | null>(null)
  const syncTimeoutRef = useRef<number | null>(null)
  const syncInFlightRef = useRef(false)
  const syncNowRef = useRef<() => Promise<void>>(async () => {})
  const isBootstrappingRef = useRef(false)
  const queuedEventsRef = useRef<LearningProgressEvent[]>([])

  const getStorageKeys = useCallback(() => {
    if (isSignedIn && user?.id) {
      return {
        snapshotKey: getAuthSnapshotKey(user.id),
        eventsKey: getAuthEventsKey(user.id),
        syncKey: getAuthSyncKey(user.id),
      }
    }

    return {
      snapshotKey: CAMPAIGN_PROGRESS_STORAGE_KEY,
      eventsKey: CAMPAIGN_PROGRESS_EVENTS_STORAGE_KEY,
      syncKey: null,
    }
  }, [isSignedIn, user?.id])

  const getClientId = useCallback((): string => {
    if (clientIdRef.current) {
      return clientIdRef.current
    }

    const storedClientId = readJsonFromStorage(CAMPAIGN_PROGRESS_CLIENT_ID_STORAGE_KEY)
    if (typeof storedClientId === 'string' && storedClientId.trim().length > 0) {
      clientIdRef.current = storedClientId
      return storedClientId
    }

    const generatedClientId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `campaign-client-${Date.now()}-${Math.random().toString(16).slice(2)}`

    clientIdRef.current = generatedClientId
    writeJsonToStorage(CAMPAIGN_PROGRESS_CLIENT_ID_STORAGE_KEY, generatedClientId)
    return generatedClientId
  }, [])

  const createDefaultCampaignAuditEvent = useCallback(
    (record: InteractiveStateRecord): InteractiveAuditEvent | null => {
      if (record.value === null || isClearedCampaignRecord(record)) {
        return null
      }

      return {
        id: createEventId(),
        recordKey: record.key,
        lessonId: record.lessonId,
        interactionId: record.interactionId,
        type: 'submitted',
        at: record.updatedAt,
        actor: 'user',
        value: record.value,
      }
    },
    [],
  )

  const createInteractiveUpdatedEvent = useCallback((payload: {
    readonly record: InteractiveStateRecord
    readonly auditEvents?: readonly InteractiveAuditEvent[]
  }): LearningProgressEvent => {
    return {
      eventId: createEventId(),
      clientId: getClientId(),
      occurredAt: payload.record.updatedAt,
      type: 'interactive.updated',
      payload,
    }
  }, [getClientId])

  const persistSnapshot = useCallback((snapshotKey: string, snapshot: CampaignProgressSnapshot): void => {
    writeJsonToStorage(snapshotKey, snapshot)
  }, [])

  const persistEvents = useCallback((eventsKey: string, events: readonly LearningProgressEvent[]): void => {
    writeJsonToStorage(eventsKey, events)
  }, [])

  const persistSyncState = useCallback((syncKey: string | null): void => {
    if (!syncKey) return
    writeJsonToStorage(syncKey, syncStateRef.current)
  }, [])

  const recomputeFromStorage = useCallback(() => {
    const keys = getStorageKeys()
    const storedSnapshot = loadSnapshotForKey(keys.snapshotKey) ?? getEmptyCampaignProgressSnapshot()
    const storedEvents = loadEventsForKey(keys.eventsKey)
    const nextSnapshot = storedEvents.length > 0
      ? applyEventsToSnapshot(storedSnapshot, storedEvents)
      : storedSnapshot

    eventsRef.current = storedEvents
    setProgress(nextSnapshot)
    setLocalSelectedEntityCui(nextSnapshot.selectedEntityCui)
  }, [getStorageKeys])

  const queueSync = useCallback(() => {
    if (!isSignedIn || !user?.id) {
      return
    }

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      void syncNowRef.current()
    }, SYNC_DEBOUNCE_MS)
  }, [isSignedIn, user?.id])

  const appendEvents = useCallback((events: readonly LearningProgressEvent[]) => {
    if (events.length === 0) {
      return
    }

    if (isBootstrappingRef.current) {
      queuedEventsRef.current = mergeEventLogs(queuedEventsRef.current, events)
      setProgress((current) => applyEventsToSnapshot(current, events))
      return
    }

    const keys = getStorageKeys()
    const nextEvents = mergeEventLogs(eventsRef.current, events)
    const nextSnapshot = applyEventsToSnapshot(progressRef.current, events)

    eventsRef.current = nextEvents
    persistEvents(keys.eventsKey, nextEvents)
    persistSnapshot(keys.snapshotKey, nextSnapshot)
    setProgress(nextSnapshot)
    setLocalSelectedEntityCui(nextSnapshot.selectedEntityCui)

    queueSync()
  }, [getStorageKeys, persistEvents, persistSnapshot, queueSync])

  const refreshRemoteProgress = useCallback(async () => {
    if (!isSignedIn || !user?.id) {
      return
    }

    const keys = getStorageKeys()
    const since = syncStateRef.current.lastSyncedCursor

    try {
      const remote = await fetchCampaignProgress(since ? { since } : {})
      setRemoteSelectedEntityCui(remote.snapshot.selectedEntityCui)
      const nextSnapshot = since
        ? applyEventsToSnapshot(progressRef.current, remote.events)
        : projectCampaignProgressFromRecords(
            mergeCampaignProgressRecords(
              buildCampaignProgressRecords(progressRef.current),
              remote.recordsByKey,
            ),
            progressRef.current.lastUpdated,
          )

      persistSnapshot(keys.snapshotKey, nextSnapshot)
      setProgress(nextSnapshot)
      setLocalSelectedEntityCui(nextSnapshot.selectedEntityCui)

      syncStateRef.current = {
        ...syncStateRef.current,
        lastSyncedCursor: remote.cursor,
      }
      persistSyncState(keys.syncKey)
    } catch (error) {
      console.warn('Failed to pull remote campaign progress:', error)
    }
  }, [getStorageKeys, isSignedIn, persistSnapshot, persistSyncState, user?.id])

  const syncNow = useCallback(async () => {
    if (!isSignedIn || !user?.id) {
      return
    }

    if (isBootstrappingRef.current || syncInFlightRef.current) {
      return
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return
    }

    const keys = getStorageKeys()
    const pendingEvents = eventsRef.current

    syncInFlightRef.current = true
    setIsSyncing(true)

    try {
      if (pendingEvents.length > 0) {
        const clientUpdatedAt = pendingEvents[pendingEvents.length - 1]?.occurredAt ?? progressRef.current.lastUpdated
        await syncCampaignProgress({
          events: pendingEvents,
          clientUpdatedAt,
        })

        eventsRef.current = []
        persistEvents(keys.eventsKey, [])
        syncStateRef.current = {
          ...syncStateRef.current,
          lastSuccessfulSyncAt: nowIso(),
        }
        persistSyncState(keys.syncKey)
      }

      await refreshRemoteProgress()
    } catch (error) {
      console.warn('Failed to sync campaign progress:', error)
    } finally {
      syncInFlightRef.current = false
      setIsSyncing(false)
    }
  }, [getStorageKeys, isSignedIn, persistEvents, persistSyncState, refreshRemoteProgress, user?.id])

  const sync = useCallback(async () => {
    await syncNow()
  }, [syncNow])

  useEffect(() => {
    syncNowRef.current = syncNow
  }, [syncNow])

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let isActive = true

    const loadLocalProgress = () => {
      const keys = getStorageKeys()
      const storedSnapshot = loadSnapshotForKey(keys.snapshotKey) ?? getEmptyCampaignProgressSnapshot()
      const storedEvents = loadEventsForKey(keys.eventsKey)
      const nextSnapshot = storedEvents.length > 0
        ? applyEventsToSnapshot(storedSnapshot, storedEvents)
        : storedSnapshot

      eventsRef.current = storedEvents
      if (isActive) {
        setProgress(nextSnapshot)
        setLocalSelectedEntityCui(nextSnapshot.selectedEntityCui)
        setIsReady(true)
      }
      return nextSnapshot
    }

    if (!isLoaded) {
      loadLocalProgress()
      if (isActive) {
        setRemoteSelectedEntityCui(null)
        setIsInitialResolutionReady(true)
      }
      return
    }

    if (!isSignedIn || !user?.id) {
      loadLocalProgress()
      if (isActive) {
        setRemoteSelectedEntityCui(null)
        setIsInitialResolutionReady(true)
      }
      return
    }

    const cachedSnapshot = loadSnapshotForKey(getAuthSnapshotKey(user.id))
      ?? loadSnapshotForKey(CAMPAIGN_PROGRESS_STORAGE_KEY)
      ?? getEmptyCampaignProgressSnapshot()
    const cachedEvents = mergeEventLogs(
      loadEventsForKey(getAuthEventsKey(user.id)),
      loadEventsForKey(CAMPAIGN_PROGRESS_EVENTS_STORAGE_KEY),
    )
    const initialSnapshot = cachedEvents.length > 0
      ? applyEventsToSnapshot(cachedSnapshot, cachedEvents)
      : cachedSnapshot
    eventsRef.current = cachedEvents
    if (isActive) {
      setProgress(initialSnapshot)
      setLocalSelectedEntityCui(initialSnapshot.selectedEntityCui)
      setIsReady(true)
      setIsInitialResolutionReady(false)
    }

    const bootstrap = async () => {
      isBootstrappingRef.current = true

      const guestSnapshot = loadSnapshotForKey(CAMPAIGN_PROGRESS_STORAGE_KEY)
      const guestEvents = loadEventsForKey(CAMPAIGN_PROGRESS_EVENTS_STORAGE_KEY)
      const authSnapshot = loadSnapshotForKey(getAuthSnapshotKey(user.id))
      const authEvents = loadEventsForKey(getAuthEventsKey(user.id))
      syncStateRef.current = parseSyncState(readJsonFromStorage(getAuthSyncKey(user.id)))

      let remoteRecords: Readonly<Record<string, InteractiveStateRecord>> = {}
      let remoteSnapshot = getEmptyCampaignProgressSnapshot()
      let remoteCursor: string | null = syncStateRef.current.lastSyncedCursor

      try {
        const remote = await fetchCampaignProgress({})
        remoteRecords = remote.recordsByKey
        remoteSnapshot = remote.snapshot
        remoteCursor = remote.cursor
        if (isActive) {
          setRemoteSelectedEntityCui(remote.snapshot.selectedEntityCui)
        }
      } catch (error) {
        console.warn('Failed to fetch remote campaign progress:', error)
        if (isActive) {
          setRemoteSelectedEntityCui(null)
        }
      }

      const pendingEvents = mergeEventLogs(
        guestEvents,
        authEvents,
        queuedEventsRef.current,
      )
      queuedEventsRef.current = []

      const localRecords = mergeCampaignProgressRecords(
        buildCampaignProgressRecords(guestSnapshot ?? getEmptyCampaignProgressSnapshot()),
        buildCampaignProgressRecords(authSnapshot ?? getEmptyCampaignProgressSnapshot()),
      )
      const mergedRecords = mergeCampaignProgressRecords(localRecords, remoteRecords)
      const nextRecords = applyCampaignProgressEventsToRecords(mergedRecords, pendingEvents)
      const pendingRecordKeys = new Set(
        filterCampaignProgressEvents(pendingEvents).map((event) => event.payload.record.key),
      )
      const migrationEvents = diffCampaignProgressRecords(nextRecords, remoteRecords)
        .filter((record) => !pendingRecordKeys.has(record.key))
        // Bootstrap migration only backfills record state; it should not invent user-submission audits.
        .map((record) => createInteractiveUpdatedEvent({ record }))
      const nextEvents = mergeEventLogs(pendingEvents, migrationEvents)
      const nextSnapshot = projectCampaignProgressFromRecords(nextRecords, remoteSnapshot.lastUpdated)

      eventsRef.current = nextEvents
      persistEvents(getAuthEventsKey(user.id), nextEvents)
      persistSnapshot(getAuthSnapshotKey(user.id), nextSnapshot)
      if (isActive) {
        setProgress(nextSnapshot)
        setLocalSelectedEntityCui(nextSnapshot.selectedEntityCui)
        setIsReady(true)
      }

      syncStateRef.current = {
        ...syncStateRef.current,
        lastSyncedCursor: remoteCursor,
      }
      persistSyncState(getAuthSyncKey(user.id))

      if (hasProgressData(guestSnapshot) || guestEvents.length > 0) {
        removeFromStorage(CAMPAIGN_PROGRESS_STORAGE_KEY)
        removeFromStorage(CAMPAIGN_PROGRESS_EVENTS_STORAGE_KEY)
      }

      isBootstrappingRef.current = false
      if (isActive) {
        setIsInitialResolutionReady(true)
      }

      if (nextEvents.length > 0) {
        queueSync()
      }
    }

    void bootstrap().finally(() => {
      isBootstrappingRef.current = false
      if (isActive) {
        setIsReady(true)
        setIsInitialResolutionReady(true)
      }
    })

    return () => {
      isActive = false
    }
  }, [
    createInteractiveUpdatedEvent,
    getStorageKeys,
    isLoaded,
    isSignedIn,
    persistEvents,
    persistSnapshot,
    persistSyncState,
    queueSync,
    user?.id,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return

    let storageDebounceTimeout: number | null = null

    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith('campaign_progress_')) {
        return
      }

      if (storageDebounceTimeout) {
        window.clearTimeout(storageDebounceTimeout)
      }

      storageDebounceTimeout = window.setTimeout(() => {
        recomputeFromStorage()
      }, 100)
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      if (storageDebounceTimeout) {
        window.clearTimeout(storageDebounceTimeout)
      }
    }
  }, [recomputeFromStorage])

  const getChallengeStatus = useCallback((challengeSlug: string): CampaignChallengeStatus => {
    return progressRef.current.challenges[challengeSlug]?.status ?? 'not_started'
  }, [])

  const setChallengeStatus = useCallback((
    challengeSlug: string,
    status: CampaignChallengeStatus,
    options?: {
      readonly attempts?: number
      readonly incrementAttempts?: boolean
      readonly emitAuditEvent?: boolean
    },
  ) => {
    const previousChallengeProgress = progressRef.current.challenges[challengeSlug]
    const shouldIncreaseAttempts =
      (options?.incrementAttempts ?? true)
      && previousChallengeProgress?.status !== status
      && (status === 'in_progress' || status === 'pending_review' || status === 'completed')
    const nextAttempts = typeof options?.attempts === 'number'
      ? Math.max(0, options.attempts)
      : (previousChallengeProgress?.attempts ?? 0) + (shouldIncreaseAttempts ? 1 : 0)
    const nextUpdatedAt = getNextTimestamp(previousChallengeProgress?.updatedAt ?? progressRef.current.lastUpdated)

    const record = createCampaignChallengeRecord({
      challengeSlug,
      status,
      attempts: nextAttempts,
      updatedAt: nextUpdatedAt,
    })
    const auditEvent = options?.emitAuditEvent === false
      ? null
      : createDefaultCampaignAuditEvent(record)

    appendEvents([createInteractiveUpdatedEvent({
      record,
      auditEvents: auditEvent ? [auditEvent] : undefined,
    })])
  }, [appendEvents, createDefaultCampaignAuditEvent, createInteractiveUpdatedEvent])

  const markChallengeInProgress = useCallback((challengeSlug: string) => {
    const existingStatus = getChallengeStatus(challengeSlug)
    if (
      existingStatus === 'in_progress'
      || existingStatus === 'completed'
      || existingStatus === 'pending_review'
      || existingStatus === 'locked'
    ) {
      return
    }

    setChallengeStatus(challengeSlug, 'in_progress')
  }, [getChallengeStatus, setChallengeStatus])

  const completeOnboarding = useCallback((input: { locality: string }) => {
    const normalizedLocality = input.locality.trim()
    if (!normalizedLocality) {
      return
    }

    const updatedAt = getNextTimestamp(getRecordUpdatedAt(progressRef.current, CAMPAIGN_ONBOARDING_RECORD_KEY))
    const record = createCampaignOnboardingRecord({
      completedAt: updatedAt,
      locality: normalizedLocality,
      updatedAt,
    })
    const auditEvent = createDefaultCampaignAuditEvent(record)

    appendEvents([createInteractiveUpdatedEvent({
      record,
      auditEvents: auditEvent ? [auditEvent] : undefined,
    })])
  }, [appendEvents, createDefaultCampaignAuditEvent, createInteractiveUpdatedEvent])

  const acceptChallengeTerms = useCallback((input?: { acceptedTermsAt?: string }) => {
    const acceptedTermsAt = input?.acceptedTermsAt ?? nowIso()
    const updatedAt = getNextTimestamp(
      getRecordUpdatedAt(progressRef.current, CAMPAIGN_ACCEPTED_TERMS_RECORD_KEY) ?? acceptedTermsAt,
    )

    const record = createCampaignAcceptedTermsRecord({
      acceptedTermsAt,
      updatedAt,
    })
    const auditEvent = createDefaultCampaignAuditEvent(record)

    appendEvents([createInteractiveUpdatedEvent({
      record,
      auditEvents: auditEvent ? [auditEvent] : undefined,
    })])
  }, [appendEvents, createDefaultCampaignAuditEvent, createInteractiveUpdatedEvent])

  const resetAcceptedChallengeTerms = useCallback(() => {
    const record = createCampaignAcceptedTermsRecord({
      acceptedTermsAt: null,
      updatedAt: getNextTimestamp(getRecordUpdatedAt(progressRef.current, CAMPAIGN_ACCEPTED_TERMS_RECORD_KEY)),
    })
    const auditEvent = createDefaultCampaignAuditEvent(record)

    appendEvents([createInteractiveUpdatedEvent({
      record,
      auditEvents: auditEvent ? [auditEvent] : undefined,
    })])
  }, [appendEvents, createDefaultCampaignAuditEvent, createInteractiveUpdatedEvent])

  const resetProgress = useCallback(() => {
    const currentProgress = progressRef.current
    const nextEvents: LearningProgressEvent[] = [
      (() => {
        const record = createCampaignOnboardingRecord({
          completedAt: null,
          locality: null,
          updatedAt: getNextTimestamp(getRecordUpdatedAt(currentProgress, CAMPAIGN_ONBOARDING_RECORD_KEY)),
        })
        const auditEvent = createDefaultCampaignAuditEvent(record)
        return createInteractiveUpdatedEvent({
          record,
          auditEvents: auditEvent ? [auditEvent] : undefined,
        })
      })(),
      (() => {
        const record = createCampaignSelectedEntityRecord({
          entityCui: null,
          updatedAt: getNextTimestamp(getRecordUpdatedAt(currentProgress, CAMPAIGN_SELECTED_ENTITY_RECORD_KEY)),
        })
        const auditEvent = createDefaultCampaignAuditEvent(record)
        return createInteractiveUpdatedEvent({
          record,
          auditEvents: auditEvent ? [auditEvent] : undefined,
        })
      })(),
      (() => {
        const record = createCampaignActiveModuleRecord({
          moduleSlug: null,
          updatedAt: getNextTimestamp(getRecordUpdatedAt(currentProgress, CAMPAIGN_ACTIVE_MODULE_RECORD_KEY)),
        })
        const auditEvent = createDefaultCampaignAuditEvent(record)
        return createInteractiveUpdatedEvent({
          record,
          auditEvents: auditEvent ? [auditEvent] : undefined,
        })
      })(),
      ...Object.entries(currentProgress.challenges).map(([challengeSlug, challengeProgress]) => {
        const record = createCampaignChallengeRecord({
          challengeSlug,
          status: 'not_started',
          attempts: 0,
          updatedAt: getNextTimestamp(challengeProgress.updatedAt),
        })
        const auditEvent = createDefaultCampaignAuditEvent(record)
        return createInteractiveUpdatedEvent({
          record,
          auditEvents: auditEvent ? [auditEvent] : undefined,
        })
      }),
    ]

    setLocalSelectedEntityCui(null)
    appendEvents(nextEvents)
  }, [appendEvents, createDefaultCampaignAuditEvent, createInteractiveUpdatedEvent])

  const setSelectedEntity = useCallback((input: { entityCui: string }) => {
    const normalizedEntityCui = input.entityCui.trim()
    if (!normalizedEntityCui || normalizedEntityCui === progressRef.current.selectedEntityCui) {
      return
    }

    const updatedAt = getNextTimestamp(getRecordUpdatedAt(progressRef.current, CAMPAIGN_SELECTED_ENTITY_RECORD_KEY))
    const record = createCampaignSelectedEntityRecord({
      entityCui: normalizedEntityCui,
      updatedAt,
    })
    const auditEvent = createDefaultCampaignAuditEvent(record)
    const nextEvent = createInteractiveUpdatedEvent({
      record,
      auditEvents: auditEvent ? [auditEvent] : undefined,
    })

    setLocalSelectedEntityCui(normalizedEntityCui)
    appendEvents([nextEvent])
  }, [appendEvents, createDefaultCampaignAuditEvent, createInteractiveUpdatedEvent])

  const setActiveChallengeModule = useCallback((input: { moduleSlug: string | null }) => {
    const normalizedModuleSlug = input.moduleSlug?.trim() || null
    if (normalizedModuleSlug === progressRef.current.activeChallengeModuleSlug) {
      return
    }

    const updatedAt = getNextTimestamp(getRecordUpdatedAt(progressRef.current, CAMPAIGN_ACTIVE_MODULE_RECORD_KEY))
    const record = createCampaignActiveModuleRecord({
      moduleSlug: normalizedModuleSlug,
      updatedAt,
    })
    const auditEvent = createDefaultCampaignAuditEvent(record)

    appendEvents([createInteractiveUpdatedEvent({
      record,
      auditEvents: auditEvent ? [auditEvent] : undefined,
    })])
  }, [appendEvents, createDefaultCampaignAuditEvent, createInteractiveUpdatedEvent])

  const value = useMemo<CampaignProgressContextValue>(() => ({
    isReady,
    isInitialResolutionReady,
    isSyncing,
    progress,
    localSelectedEntityCui,
    remoteSelectedEntityCui,
    getChallengeStatus,
    setChallengeStatus,
    setSelectedEntity,
    setActiveChallengeModule,
    markChallengeInProgress,
    completeOnboarding,
    acceptChallengeTerms,
    resetAcceptedChallengeTerms,
    resetProgress,
    sync,
  }), [
    acceptChallengeTerms,
    completeOnboarding,
    getChallengeStatus,
    isInitialResolutionReady,
    isReady,
    isSyncing,
    localSelectedEntityCui,
    markChallengeInProgress,
    progress,
    remoteSelectedEntityCui,
    resetProgress,
    resetAcceptedChallengeTerms,
    setActiveChallengeModule,
    setChallengeStatus,
    setSelectedEntity,
    sync,
  ])

  return <CampaignProgressContext.Provider value={value}>{children}</CampaignProgressContext.Provider>
}

export function useCampaignProgress() {
  const context = useContext(CampaignProgressContext)

  if (!context) {
    throw new Error('useCampaignProgress must be used within CampaignProgressProvider.')
  }

  return context
}
