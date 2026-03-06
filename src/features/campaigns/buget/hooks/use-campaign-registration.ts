import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  CAMPAIGN_ID,
  CAMPAIGN_REGISTRATION_STORAGE_KEY_PREFIX,
} from '../constants'

const REGISTRATION_SIMULATION_DELAY_MS = 700

type CampaignRegistrationSnapshot = {
  readonly registeredAt: string | null
  readonly acceptedTermsAt: string | null
}

type CampaignRegistrationState = {
  readonly isReady: boolean
  readonly isRegistered: boolean
  readonly isSubmitting: boolean
  readonly registeredAt: string | null
  readonly register: () => Promise<void>
  readonly reset: () => void
}

const EMPTY_REGISTRATION_SNAPSHOT: CampaignRegistrationSnapshot = {
  registeredAt: null,
  acceptedTermsAt: null,
}

function getRegistrationStorageKey(userId: string): string {
  return `${CAMPAIGN_REGISTRATION_STORAGE_KEY_PREFIX}:${CAMPAIGN_ID}:${userId}`
}

function readRegistrationSnapshot(userId: string): CampaignRegistrationSnapshot {
  if (typeof window === 'undefined') return EMPTY_REGISTRATION_SNAPSHOT

  const rawValue = window.localStorage.getItem(getRegistrationStorageKey(userId))
  if (!rawValue) return EMPTY_REGISTRATION_SNAPSHOT

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<CampaignRegistrationSnapshot>
    return {
      registeredAt: parsedValue.registeredAt ?? null,
      acceptedTermsAt: parsedValue.acceptedTermsAt ?? null,
    }
  } catch {
    return EMPTY_REGISTRATION_SNAPSHOT
  }
}

function writeRegistrationSnapshot(
  userId: string,
  snapshot: CampaignRegistrationSnapshot,
): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    getRegistrationStorageKey(userId),
    JSON.stringify(snapshot),
  )
}

export function useCampaignRegistration(): CampaignRegistrationState {
  const { isEnabled, isLoaded, isSignedIn, user } = useAuth()
  const [isReady, setIsReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registration, setRegistration] = useState<CampaignRegistrationSnapshot>(
    EMPTY_REGISTRATION_SNAPSHOT,
  )

  const userId = user?.id ?? null

  useEffect(() => {
    if (!isLoaded) {
      setIsReady(false)
      return
    }

    if (!isEnabled || !isSignedIn || !userId) {
      setRegistration(EMPTY_REGISTRATION_SNAPSHOT)
      setIsReady(true)
      return
    }

    setRegistration(readRegistrationSnapshot(userId))
    setIsReady(true)
  }, [isEnabled, isLoaded, isSignedIn, userId])

  const register = useCallback(async () => {
    if (!isLoaded || !isEnabled || !isSignedIn || !userId || isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, REGISTRATION_SIMULATION_DELAY_MS)
      })

      const registeredAt = new Date().toISOString()
      const nextSnapshot: CampaignRegistrationSnapshot = {
        registeredAt,
        acceptedTermsAt: registeredAt,
      }

      writeRegistrationSnapshot(userId, nextSnapshot)
      setRegistration(nextSnapshot)
    } finally {
      setIsSubmitting(false)
    }
  }, [isEnabled, isLoaded, isSignedIn, isSubmitting, userId])

  const reset = useCallback(() => {
    if (!userId || typeof window === 'undefined') {
      setRegistration(EMPTY_REGISTRATION_SNAPSHOT)
      return
    }

    window.localStorage.removeItem(getRegistrationStorageKey(userId))
    setRegistration(EMPTY_REGISTRATION_SNAPSHOT)
  }, [userId])

  return useMemo(
    () => ({
      isReady,
      isRegistered: registration.registeredAt !== null,
      isSubmitting,
      registeredAt: registration.registeredAt,
      register,
      reset,
    }),
    [isReady, isSubmitting, registration.registeredAt, register, reset],
  )
}
