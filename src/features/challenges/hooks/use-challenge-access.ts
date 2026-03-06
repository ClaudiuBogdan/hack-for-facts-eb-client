import { useCampaignRegistration } from '@/features/campaigns/buget/hooks/use-campaign-registration'
import { useAuth } from '@/lib/auth'

export type ChallengeAccessCardVariant = 'loading' | 'auth' | 'register'

type ChallengeAccessState = {
  readonly accessCardVariant: ChallengeAccessCardVariant | null
  readonly isAccessGranted: boolean
  readonly isSubmitting: boolean
  readonly register: () => Promise<void>
}

export function useChallengeAccess(): ChallengeAccessState {
  const { isEnabled: isAuthEnabled, isLoaded: isAuthLoaded, isSignedIn } = useAuth()
  const {
    isReady: isRegistrationReady,
    isRegistered,
    isSubmitting,
    register,
  } = useCampaignRegistration()

  if (!isAuthEnabled) {
    return {
      accessCardVariant: null,
      isAccessGranted: true,
      isSubmitting,
      register,
    }
  }

  if (!isAuthLoaded || (isSignedIn && !isRegistrationReady)) {
    return {
      accessCardVariant: 'loading',
      isAccessGranted: false,
      isSubmitting,
      register,
    }
  }

  if (!isSignedIn) {
    return {
      accessCardVariant: 'auth',
      isAccessGranted: false,
      isSubmitting,
      register,
    }
  }

  if (!isRegistered) {
    return {
      accessCardVariant: 'register',
      isAccessGranted: false,
      isSubmitting,
      register,
    }
  }

  return {
    accessCardVariant: null,
    isAccessGranted: true,
    isSubmitting,
    register,
  }
}
