import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAMPAIGN_ID,
  CAMPAIGN_REGISTRATION_STORAGE_KEY_PREFIX,
} from '../constants'
import { useCampaignRegistration } from './use-campaign-registration'

type MockAuthState = {
  isEnabled: boolean
  isLoaded: boolean
  isSignedIn: boolean
  user: { id: string } | null
}

let authState: MockAuthState = {
  isEnabled: true,
  isLoaded: true,
  isSignedIn: false,
  user: null,
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

function getRegistrationStorageKey(userId: string): string {
  return `${CAMPAIGN_REGISTRATION_STORAGE_KEY_PREFIX}:${CAMPAIGN_ID}:${userId}`
}

describe('useCampaignRegistration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: false,
      user: null,
    }
    vi.useRealTimers()
  })

  it('reports ready for signed-out users without registering them', async () => {
    const { result } = renderHook(() => useCampaignRegistration())

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    expect(result.current.isRegistered).toBe(false)
  })

  it('persists registration for the current signed-in user', async () => {
    vi.useFakeTimers()
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    const { result, rerender } = renderHook(() => useCampaignRegistration())

    await act(async () => {
      // Flush mount effects before driving the fake timer registration flow.
    })
    expect(result.current.isReady).toBe(true)

    expect(result.current.isRegistered).toBe(false)

    await act(async () => {
      const registrationPromise = result.current.register()
      await vi.advanceTimersByTimeAsync(700)
      await registrationPromise
    })

    expect(result.current.isRegistered).toBe(true)

    const storedValue = window.localStorage.getItem(getRegistrationStorageKey('user-1'))
    expect(storedValue).toBeTruthy()
    expect(JSON.parse(storedValue ?? '{}')).toEqual(
      expect.objectContaining({
        registeredAt: expect.any(String),
        acceptedTermsAt: expect.any(String),
      }),
    )

    rerender()
    expect(result.current.isRegistered).toBe(true)
  })

  it('isolates registration state per signed-in user', async () => {
    vi.useFakeTimers()
    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-1' },
    }

    const { result, rerender } = renderHook(() => useCampaignRegistration())

    await act(async () => {
      // Flush mount effects before driving the fake timer registration flow.
    })
    expect(result.current.isReady).toBe(true)

    await act(async () => {
      const registrationPromise = result.current.register()
      await vi.advanceTimersByTimeAsync(700)
      await registrationPromise
    })

    expect(result.current.isRegistered).toBe(true)

    authState = {
      isEnabled: true,
      isLoaded: true,
      isSignedIn: true,
      user: { id: 'user-2' },
    }

    await act(async () => {
      rerender()
    })

    expect(result.current.isRegistered).toBe(false)
    expect(
      window.localStorage.getItem(getRegistrationStorageKey('user-2')),
    ).toBeNull()
  })
})
