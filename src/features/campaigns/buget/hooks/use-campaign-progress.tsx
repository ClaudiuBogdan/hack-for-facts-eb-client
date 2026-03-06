import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  CAMPAIGN_ID,
  CAMPAIGN_PROGRESS_STORAGE_KEY,
} from '../constants'
import {
  createChallengeProgress,
  getEmptyCampaignProgressSnapshot,
  parseCampaignProgressSnapshot,
} from '../schemas/progress-schema'
import { fetchCampaignProgress, syncCampaignProgress } from '../api/campaign-progress'
import type {
  CampaignChallengeStatus,
  CampaignProgressSnapshot,
} from '../types'

type CampaignProgressContextValue = {
  readonly isReady: boolean
  readonly isInitialResolutionReady: boolean
  readonly isSyncing: boolean
  readonly progress: CampaignProgressSnapshot
  readonly localSelectedEntityCui: string | null
  readonly remoteSelectedEntityCui: string | null
  readonly getChallengeStatus: (challengeSlug: string) => CampaignChallengeStatus
  readonly setChallengeStatus: (challengeSlug: string, status: CampaignChallengeStatus) => void
  readonly setSelectedEntity: (input: { entityCui: string }) => void
  readonly markChallengeInProgress: (challengeSlug: string) => void
  readonly completeOnboarding: (input: { locality: string }) => void
  readonly resetProgress: () => void
  readonly sync: () => Promise<void>
}

const CampaignProgressContext = createContext<CampaignProgressContextValue | null>(null)

function readSnapshotFromStorage(): CampaignProgressSnapshot | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    return parseCampaignProgressSnapshot(parsed)
  } catch {
    return null
  }
}

function writeSnapshotToStorage(snapshot: CampaignProgressSnapshot): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CAMPAIGN_PROGRESS_STORAGE_KEY, JSON.stringify(snapshot))
}

function mergeCampaignProgressSnapshots(
  localSnapshot: CampaignProgressSnapshot,
  remoteSnapshot: CampaignProgressSnapshot,
): CampaignProgressSnapshot {
  const preferLocalValues = localSnapshot.lastUpdated > remoteSnapshot.lastUpdated
  const mergedChallenges = { ...localSnapshot.challenges }

  for (const [challengeSlug, remoteChallengeProgress] of Object.entries(remoteSnapshot.challenges)) {
    const localChallengeProgress = mergedChallenges[challengeSlug]

    if (!localChallengeProgress || remoteChallengeProgress.updatedAt > localChallengeProgress.updatedAt) {
      mergedChallenges[challengeSlug] = remoteChallengeProgress
    }
  }

  return {
    ...localSnapshot,
    campaignId: remoteSnapshot.campaignId,
    onboardingCompletedAt:
      remoteSnapshot.onboardingCompletedAt &&
      (!localSnapshot.onboardingCompletedAt || remoteSnapshot.onboardingCompletedAt > localSnapshot.onboardingCompletedAt)
        ? remoteSnapshot.onboardingCompletedAt
        : localSnapshot.onboardingCompletedAt,
    selectedLocality: preferLocalValues
      ? localSnapshot.selectedLocality ?? remoteSnapshot.selectedLocality
      : remoteSnapshot.selectedLocality ?? localSnapshot.selectedLocality,
    selectedEntityCui: preferLocalValues
      ? localSnapshot.selectedEntityCui ?? remoteSnapshot.selectedEntityCui
      : remoteSnapshot.selectedEntityCui ?? localSnapshot.selectedEntityCui,
    challenges: mergedChallenges,
    lastUpdated: localSnapshot.lastUpdated > remoteSnapshot.lastUpdated
      ? localSnapshot.lastUpdated
      : remoteSnapshot.lastUpdated,
  }
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

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const storedSnapshot = readSnapshotFromStorage()

    if (storedSnapshot && storedSnapshot.campaignId === CAMPAIGN_ID) {
      setProgress(storedSnapshot)
      setLocalSelectedEntityCui(storedSnapshot.selectedEntityCui)
    } else {
      const emptySnapshot = getEmptyCampaignProgressSnapshot()
      setProgress(emptySnapshot)
      writeSnapshotToStorage(emptySnapshot)
      setLocalSelectedEntityCui(emptySnapshot.selectedEntityCui)
    }

    setIsReady(true)
    setIsInitialResolutionReady(true)
  }, [])

  useEffect(() => {
    if (!isReady) return
    writeSnapshotToStorage(progress)
  }, [progress, isReady])

  const getChallengeStatus = useCallback((challengeSlug: string): CampaignChallengeStatus => {
    return progressRef.current.challenges[challengeSlug]?.status ?? 'not_started'
  }, [])

  const setChallengeStatus = useCallback((challengeSlug: string, status: CampaignChallengeStatus) => {
    setProgress((current) => {
      const previousChallengeProgress = current.challenges[challengeSlug]
      const shouldIncreaseAttempts =
        previousChallengeProgress?.status !== status &&
        (status === 'in_progress' || status === 'pending_review' || status === 'completed')

      const nextChallengeProgress = createChallengeProgress(
        status,
        (previousChallengeProgress?.attempts ?? 0) + (shouldIncreaseAttempts ? 1 : 0),
      )

      return {
        ...current,
        challenges: {
          ...current.challenges,
          [challengeSlug]: nextChallengeProgress,
        },
        lastUpdated: new Date().toISOString(),
      }
    })
  }, [])

  const markChallengeInProgress = useCallback((challengeSlug: string) => {
    const existingStatus = getChallengeStatus(challengeSlug)
    if (existingStatus === 'completed' || existingStatus === 'pending_review' || existingStatus === 'locked') {
      return
    }

    setChallengeStatus(challengeSlug, 'in_progress')
  }, [getChallengeStatus, setChallengeStatus])

  const completeOnboarding = useCallback((input: { locality: string }) => {
    setProgress((current) => ({
      ...current,
      onboardingCompletedAt: new Date().toISOString(),
      selectedLocality: input.locality,
      lastUpdated: new Date().toISOString(),
    }))
  }, [])

  const resetProgress = useCallback(() => {
    const emptySnapshot = getEmptyCampaignProgressSnapshot()
    setProgress(emptySnapshot)
  }, [])

  const syncSnapshot = useCallback(async () => {
    if (!isSignedIn || !user?.id) return

    setIsSyncing(true)

    try {
      const remote = await fetchCampaignProgress({ campaignId: CAMPAIGN_ID })
      setRemoteSelectedEntityCui(remote.snapshot.selectedEntityCui)
      const mergedSnapshot = mergeCampaignProgressSnapshots(progressRef.current, remote.snapshot)
      setProgress(mergedSnapshot)

      await syncCampaignProgress({
        campaignId: CAMPAIGN_ID,
        snapshot: mergedSnapshot,
        clientUpdatedAt: mergedSnapshot.lastUpdated,
      })
    } finally {
      setIsSyncing(false)
    }
  }, [isSignedIn, user?.id])

  const sync = useCallback(async () => {
    await syncSnapshot()
  }, [syncSnapshot])

  const setSelectedEntity = useCallback((input: { entityCui: string }) => {
    const normalizedEntityCui = input.entityCui.trim()
    if (!normalizedEntityCui) return

    const nextSnapshot: CampaignProgressSnapshot = {
      ...progressRef.current,
      selectedEntityCui: normalizedEntityCui,
      lastUpdated: new Date().toISOString(),
    }

    setLocalSelectedEntityCui(normalizedEntityCui)
    progressRef.current = nextSnapshot
    setProgress(nextSnapshot)

    if (isLoaded && isSignedIn) {
      void syncSnapshot()
    }
  }, [isLoaded, isSignedIn, syncSnapshot])

  useEffect(() => {
    if (!isReady) return

    let isActive = true

    if (!isLoaded) {
      return () => {
        isActive = false
      }
    }

    const resolveInitialState = async () => {
      if (!isSignedIn) {
        if (isActive) {
          setRemoteSelectedEntityCui(null)
          setIsInitialResolutionReady(true)
        }
        return
      }

      try {
        await sync()
      } finally {
        if (isActive) {
          setIsInitialResolutionReady(true)
        }
      }
    }

    void resolveInitialState()

    return () => {
      isActive = false
    }
  }, [isReady, isLoaded, isSignedIn, sync])

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
    markChallengeInProgress,
    completeOnboarding,
    resetProgress,
    sync,
  }), [
    isReady,
    isInitialResolutionReady,
    isSyncing,
    progress,
    localSelectedEntityCui,
    remoteSelectedEntityCui,
    getChallengeStatus,
    setChallengeStatus,
    setSelectedEntity,
    markChallengeInProgress,
    completeOnboarding,
    resetProgress,
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
