import { useCallback, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useCampaignProgress } from './use-campaign-progress'

type CampaignRegistrationState = {
  readonly isReady: boolean
  readonly isRegistered: boolean
  readonly isSubmitting: boolean
  readonly registeredAt: string | null
  readonly register: () => Promise<void>
}

export function useCampaignRegistration(entityCui: string | null): CampaignRegistrationState {
  const { isEnabled, isLoaded, isSignedIn, user } = useAuth()
  const {
    isReady: isCampaignProgressReady,
    isInitialResolutionReady,
    progress,
    acceptEntityTerms,
  } = useCampaignProgress()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const userId = user?.id ?? null

  const register = useCallback(async () => {
    if (!isLoaded || !isEnabled || !isSignedIn || !userId || isSubmittingRef.current || !entityCui) {
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    try {
      acceptEntityTerms(entityCui)
      // Keep the guard active through the current microtask so duplicate
      // same-tick calls cannot slip past a synchronous acceptEntityTerms().
      await Promise.resolve()
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }, [acceptEntityTerms, entityCui, isEnabled, isLoaded, isSignedIn, userId])

  const isReady = isCampaignProgressReady && (!isEnabled || !isSignedIn || isInitialResolutionReady)

  const registeredAt = entityCui
    ? (progress.acceptedTermsByEntity[entityCui] ?? null)
    : null

  return useMemo(
    () => ({
      isReady,
      isRegistered: registeredAt !== null,
      isSubmitting,
      registeredAt,
      register,
    }),
    [isReady, isSubmitting, register, registeredAt],
  )
}
