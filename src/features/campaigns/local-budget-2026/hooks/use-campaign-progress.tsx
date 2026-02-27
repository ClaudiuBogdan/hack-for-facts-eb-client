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
  readonly isSyncing: boolean
  readonly progress: CampaignProgressSnapshot
  readonly getChallengeStatus: (challengeSlug: string) => CampaignChallengeStatus
  readonly setChallengeStatus: (challengeSlug: string, status: CampaignChallengeStatus) => void
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
    selectedLocality: localSnapshot.selectedLocality ?? remoteSnapshot.selectedLocality,
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
  const [isSyncing, setIsSyncing] = useState(false)

  const progressRef = useRef(progress)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const storedSnapshot = readSnapshotFromStorage()

    if (storedSnapshot && storedSnapshot.campaignId === CAMPAIGN_ID) {
      setProgress(storedSnapshot)
    } else {
      const emptySnapshot = getEmptyCampaignProgressSnapshot()
      setProgress(emptySnapshot)
      writeSnapshotToStorage(emptySnapshot)
    }

    setIsReady(true)
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

  const sync = useCallback(async () => {
    if (!isSignedIn || !user?.id) return

    setIsSyncing(true)

    try {
      const remote = await fetchCampaignProgress({ campaignId: CAMPAIGN_ID })
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

  useEffect(() => {
    if (!isReady || !isLoaded || !isSignedIn) return
    void sync()
  }, [isReady, isLoaded, isSignedIn, sync])

  const value = useMemo<CampaignProgressContextValue>(() => ({
    isReady,
    isSyncing,
    progress,
    getChallengeStatus,
    setChallengeStatus,
    markChallengeInProgress,
    completeOnboarding,
    resetProgress,
    sync,
  }), [
    isReady,
    isSyncing,
    progress,
    getChallengeStatus,
    setChallengeStatus,
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
