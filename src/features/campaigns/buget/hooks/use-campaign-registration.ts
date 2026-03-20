import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useCampaignProgress } from './use-campaign-progress'

type CampaignRegistrationState = {
  readonly isReady: boolean
  readonly isRegistered: boolean
  readonly isSubmitting: boolean
  readonly registeredAt: string | null
  readonly register: () => Promise<void>
  readonly reset: () => void
}

export function useCampaignRegistration(): CampaignRegistrationState {
  const { isEnabled, isLoaded, isSignedIn, user } = useAuth()
  const {
    isReady: isCampaignProgressReady,
    isInitialResolutionReady,
    progress,
    acceptChallengeTerms,
    resetAcceptedChallengeTerms,
  } = useCampaignProgress()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const userId = user?.id ?? null

  const register = useCallback(async () => {
    if (!isLoaded || !isEnabled || !isSignedIn || !userId || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      acceptChallengeTerms()
    } finally {
      setIsSubmitting(false)
    }
  }, [acceptChallengeTerms, isEnabled, isLoaded, isSignedIn, isSubmitting, userId])

  const reset = useCallback(() => {
    if (!isLoaded || !isEnabled || !isSignedIn) {
      return
    }

    resetAcceptedChallengeTerms()
  }, [isEnabled, isLoaded, isSignedIn, resetAcceptedChallengeTerms])

  const isReady = isCampaignProgressReady && (!isEnabled || !isSignedIn || isInitialResolutionReady)
  const registeredAt = progress.acceptedTermsAt

  return useMemo(
    () => ({
      isReady,
      isRegistered: registeredAt !== null,
      isSubmitting,
      registeredAt,
      register,
      reset,
    }),
    [isReady, isSubmitting, register, registeredAt, reset],
  )
}
