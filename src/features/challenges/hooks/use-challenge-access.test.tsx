import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChallengeAccess } from './use-challenge-access'

type MockAuthState = {
  isEnabled: boolean
  isLoaded: boolean
  isSignedIn: boolean
}

type MockRegistrationState = {
  isReady: boolean
  isRegistered: boolean
  isSubmitting: boolean
  register: () => Promise<void>
}

let authState: MockAuthState = {
  isEnabled: true,
  isLoaded: true,
  isSignedIn: false,
}

const registerMock = vi.fn(async () => {})

let registrationState: MockRegistrationState = {
  isReady: true,
  isRegistered: false,
  isSubmitting: false,
  register: registerMock,
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/features/campaigns/local-budget-2026/hooks/use-campaign-registration', () => ({
  useCampaignRegistration: () => registrationState,
}))

describe('useChallengeAccess', () => {
  beforeEach(() => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: false,
    }
    registrationState = {
      isReady: true,
      isRegistered: false,
      isSubmitting: false,
      register: registerMock,
    }
  })

  it('grants access when authentication is disabled', () => {
    authState = {
      isEnabled: false,
      isLoaded: false,
      isSignedIn: false,
    }

    const { result } = renderHook(() => useChallengeAccess())

    expect(result.current.isAccessGranted).toBe(true)
    expect(result.current.accessCardVariant).toBeNull()
  })

  it('returns a loading gate while auth is still resolving', () => {
    authState = {
      isEnabled: true,
      isLoaded: false,
      isSignedIn: false,
    }

    const { result } = renderHook(() => useChallengeAccess())

    expect(result.current.isAccessGranted).toBe(false)
    expect(result.current.accessCardVariant).toBe('loading')
  })

  it('requires sign-in when auth is enabled and the user is signed out', () => {
    const { result } = renderHook(() => useChallengeAccess())

    expect(result.current.isAccessGranted).toBe(false)
    expect(result.current.accessCardVariant).toBe('auth')
  })

  it('returns a loading gate while registration state is still resolving', () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
    }
    registrationState = {
      ...registrationState,
      isReady: false,
    }

    const { result } = renderHook(() => useChallengeAccess())

    expect(result.current.isAccessGranted).toBe(false)
    expect(result.current.accessCardVariant).toBe('loading')
  })

  it('requires registration for signed-in users who are not registered', () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
    }

    const { result } = renderHook(() => useChallengeAccess())

    expect(result.current.isAccessGranted).toBe(false)
    expect(result.current.accessCardVariant).toBe('register')
  })

  it('grants access to registered users', () => {
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
    }
    registrationState = {
      ...registrationState,
      isRegistered: true,
    }

    const { result } = renderHook(() => useChallengeAccess())

    expect(result.current.isAccessGranted).toBe(true)
    expect(result.current.accessCardVariant).toBeNull()
  })
})
