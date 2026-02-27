import { useCallback } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import {
  CAMPAIGN_AUTH_INTENT_STORAGE_KEY,
  CAMPAIGN_BASE_PATH,
} from '../constants'
import type { CampaignAuthIntent } from '../types'

function saveAuthIntent(intent: CampaignAuthIntent): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(CAMPAIGN_AUTH_INTENT_STORAGE_KEY, JSON.stringify(intent))
}

function readAuthIntent(): CampaignAuthIntent | null {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(CAMPAIGN_AUTH_INTENT_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as CampaignAuthIntent
  } catch {
    return null
  }
}

function clearAuthIntent(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(CAMPAIGN_AUTH_INTENT_STORAGE_KEY)
}

export function useCampaignAuthGate() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useAuth()

  const requireAuth = useCallback((params: {
    actionId: string
    challengeSlug?: string
    redirectTo?: string
  }): boolean => {
    if (isSignedIn) return true

    saveAuthIntent({
      actionId: params.actionId,
      challengeSlug: params.challengeSlug,
      redirectTo: params.redirectTo ?? location.pathname,
      createdAt: new Date().toISOString(),
    })

    void navigate({ to: `${CAMPAIGN_BASE_PATH}/onboarding` as '/' })
    return false
  }, [isSignedIn, location.pathname, navigate])

  const consumeAuthIntent = useCallback((): CampaignAuthIntent | null => {
    const intent = readAuthIntent()
    clearAuthIntent()
    return intent
  }, [])

  return {
    isAuthReady: isLoaded,
    isAuthenticated: Boolean(isSignedIn),
    requireAuth,
    consumeAuthIntent,
  }
}
