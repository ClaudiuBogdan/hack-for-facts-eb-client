import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY,
} from '../constants'
import { CampaignProgressProvider, useCampaignProgress } from './use-campaign-progress'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: false,
    user: null,
  }),
}))

function Wrapper({ children }: { readonly children: ReactNode }) {
  return <CampaignProgressProvider>{children}</CampaignProgressProvider>
}

describe('use-campaign-progress', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('stores campaign progress without mutating learning storage keys', async () => {
    window.localStorage.setItem('learning_progress_snapshot', JSON.stringify({ sentinel: true }))

    const { result } = renderHook(() => useCampaignProgress(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.isReady).toBe(true)
    })

    act(() => {
      result.current.setChallengeStatus('invata-ce-este-buget-public-local', 'in_progress')
    })

    const campaignSnapshot = window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY)
    const learningSnapshot = window.localStorage.getItem('learning_progress_snapshot')

    expect(campaignSnapshot).toBeTruthy()
    expect(learningSnapshot).toBe(JSON.stringify({ sentinel: true }))
  })
})
