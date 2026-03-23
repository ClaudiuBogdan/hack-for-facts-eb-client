import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'

let customInteractionState = {
  record: null as null | {
    phase: 'idle' | 'pending' | 'resolved'
    result: {
      outcome: null
      feedbackText?: string | null
      response?: Record<string, unknown> | null
      evaluatedAt?: string | null
    } | null
    review?: {
      status: 'pending' | 'approved' | 'rejected'
      reviewedAt: string | null
      feedbackText?: string | null
    } | null
  },
  savedValue: null as null | Record<string, unknown>,
  phase: 'idle' as 'idle' | 'pending' | 'resolved',
  isCompleted: false,
}

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const completeMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)
const markChallengeInProgressMock = vi.fn()
const setChallengeStatusMock = vi.fn()
let persistedChallengeStatus: 'not_started' | 'in_progress' | 'pending_review' | 'completed' | 'locked' = 'not_started'
let campaignProgressState = {
  selectedEntityCui: '12345678',
  challenges: {} as Record<string, { status: string; attempts: number; updatedAt: string }>,
}

vi.mock('@/features/learning/hooks/interactions/use-custom-interaction', () => ({
  useCustomInteraction: () => ({
    ...customInteractionState,
    saveDraft: saveDraftMock,
    submit: submitMock,
    complete: completeMock,
    reset: resetMock,
  }),
}))

vi.mock('../../hooks/use-campaign-progress', () => ({
  useCampaignProgress: () => ({
    progress: campaignProgressState,
    getChallengeStatus: () => persistedChallengeStatus,
    markChallengeInProgress: markChallengeInProgressMock,
    setChallengeStatus: setChallengeStatusMock,
  }),
}))

describe('use-campaign-challenge-form', () => {
  beforeEach(() => {
    customInteractionState = {
      record: null,
      savedValue: null,
      phase: 'idle',
      isCompleted: false,
    }
    saveDraftMock.mockClear()
    submitMock.mockClear()
    completeMock.mockClear()
    resetMock.mockClear()
    markChallengeInProgressMock.mockClear()
    setChallengeStatusMock.mockClear()
    persistedChallengeStatus = 'not_started'
    campaignProgressState = {
      selectedEntityCui: '12345678',
      challenges: {},
    }
  })

  it('defers draft persistence side effects until after the current call stack', async () => {
    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: 'primarie-website-link',
        completionAction: 'pending_review',
      }),
    )

    await act(async () => {
      const saveDraftPromise = result.current.saveDraft({ websiteUrl: 'https://example.com' })

      expect(saveDraftMock).not.toHaveBeenCalled()

      await saveDraftPromise
    })

    expect(saveDraftMock).toHaveBeenCalledWith({ websiteUrl: 'https://example.com' })
    expect(markChallengeInProgressMock).toHaveBeenCalledWith('civic-monitor-and-request')
  })

  it('persists pending-review challenge status when submitting reviewable interactions', async () => {
    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: 'primarie-website-link',
        completionAction: 'pending_review',
      }),
    )

    await act(async () => {
      await result.current.submit({ websiteUrl: 'https://example.com' })
    })

    expect(submitMock).toHaveBeenCalledWith({ websiteUrl: 'https://example.com' })
    expect(completeMock).not.toHaveBeenCalled()
    expect(setChallengeStatusMock).toHaveBeenCalledWith(
      'civic-monitor-and-request',
      'pending_review',
    )
  })

  it('derives a completed submitted state from an approved review', async () => {
    customInteractionState = {
      record: {
        phase: 'resolved',
        result: null,
        review: {
          status: 'approved',
          reviewedAt: '2026-03-23T19:30:00.000Z',
          feedbackText: 'Looks good.',
        },
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'resolved',
      isCompleted: false,
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: 'primarie-website-link',
        completionAction: 'pending_review',
      }),
    )

    await waitFor(() => {
      expect(setChallengeStatusMock).toHaveBeenCalledWith(
        'civic-monitor-and-request',
        'completed',
        {
          incrementAttempts: false,
          emitAuditEvent: false,
        },
      )
    })

    expect(result.current.isSubmitted).toBe(true)
    expect(result.current.isCompleted).toBe(true)
    expect(result.current.submittedVariant).toBe('completed')
    expect(result.current.reviewStatus).toBe('approved')
    expect(result.current.reviewFeedbackText).toBe('Looks good.')
    expect(result.current.challengeStatus).toBe('completed')
  })

  it('keeps submitted review-required interactions pending when no review exists', () => {
    customInteractionState = {
      record: {
        phase: 'pending',
        result: null,
        review: null,
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'pending',
      isCompleted: false,
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: 'primarie-website-link',
        completionAction: 'pending_review',
      }),
    )

    expect(result.current.submittedVariant).toBe('pending_review')
    expect(result.current.reviewStatus).toBeNull()
    expect(result.current.reviewFeedbackText).toBeNull()
    expect(result.current.isSubmitted).toBe(true)
    expect(result.current.isCompleted).toBe(false)
    expect(result.current.challengeStatus).toBe('pending_review')
  })

  it('treats legacy resolved records without review as pending review', () => {
    customInteractionState = {
      record: {
        phase: 'resolved',
        result: {
          outcome: null,
          evaluatedAt: '2026-03-23T19:30:00.000Z',
        },
        review: null,
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'resolved',
      isCompleted: false,
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: 'primarie-website-link',
        completionAction: 'pending_review',
      }),
    )

    expect(result.current.isSubmitted).toBe(true)
    expect(result.current.submittedVariant).toBe('pending_review')
    expect(result.current.challengeStatus).toBe('pending_review')
    expect(result.current.isCompleted).toBe(false)
  })

  it('treats rejected reviews as in-progress and syncs the challenge status without attempts', async () => {
    persistedChallengeStatus = 'pending_review'
    customInteractionState = {
      record: {
        phase: 'resolved',
        result: null,
        review: {
          status: 'rejected',
          reviewedAt: '2026-03-23T19:30:00.000Z',
          feedbackText: 'Please use the official website.',
        },
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'resolved',
      isCompleted: false,
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: 'primarie-website-link',
        completionAction: 'pending_review',
      }),
    )

    await waitFor(() => {
      expect(setChallengeStatusMock).toHaveBeenCalledWith(
        'civic-monitor-and-request',
        'in_progress',
        {
          incrementAttempts: false,
          emitAuditEvent: false,
        },
      )
    })

    expect(result.current.submittedVariant).toBe('rejected')
    expect(result.current.reviewStatus).toBe('rejected')
    expect(result.current.reviewFeedbackText).toBe('Please use the official website.')
    expect(result.current.isCompleted).toBe(false)
    expect(result.current.challengeStatus).toBe('in_progress')
  })

  it('does not resync review outcomes when campaign progress already matches', () => {
    persistedChallengeStatus = 'completed'
    customInteractionState = {
      record: {
        phase: 'resolved',
        result: null,
        review: {
          status: 'approved',
          reviewedAt: '2026-03-23T19:30:00.000Z',
          feedbackText: 'Looks good.',
        },
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'resolved',
      isCompleted: false,
    }

    renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: 'primarie-website-link',
        completionAction: 'pending_review',
      }),
    )

    expect(setChallengeStatusMock).not.toHaveBeenCalled()
  })

  it('resets review-required challenge progress back to not_started', async () => {
    persistedChallengeStatus = 'pending_review'
    campaignProgressState = {
      selectedEntityCui: '12345678',
      challenges: {
        'civic-monitor-and-request': {
          status: 'pending_review',
          attempts: 1,
          updatedAt: '2026-03-23T19:30:00.000Z',
        },
      },
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: 'primarie-website-link',
        completionAction: 'pending_review',
      }),
    )

    await act(async () => {
      await result.current.reset()
    })

    expect(resetMock).toHaveBeenCalledTimes(1)
    expect(setChallengeStatusMock).toHaveBeenCalledWith(
      'civic-monitor-and-request',
      'not_started',
      {
        attempts: 0,
        emitAuditEvent: false,
        incrementAttempts: false,
      },
    )
  })
})
