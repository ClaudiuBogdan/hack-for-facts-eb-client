import { act, renderHook } from '@testing-library/react'
import type { InteractiveStateRecord } from '@/features/learning/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BUDGET_DOCUMENT_LINK_INTERACTION,
  PRIMARIE_WEBSITE_LINK_INTERACTION,
} from '../../civic-interaction-definitions'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'

let customInteractionState = {
  record: null as null | {
    phase: 'idle' | 'pending' | 'resolved' | 'failed'
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
  phase: 'idle' as 'idle' | 'pending' | 'resolved' | 'failed',
  lifecycle: {
    mode: 'async_review' as const,
    status: 'idle' as 'idle' | 'draft' | 'pending' | 'passed' | 'failed',
    reviewStatus: null as null | 'pending' | 'approved' | 'rejected',
    feedbackText: null as string | null,
    outcome: null as null | 'correct' | 'incorrect',
    isSubmitted: false,
    isSuccessful: false,
    isFailure: false,
    isPending: false,
    canRetry: false,
  },
  isCompleted: false,
}

let learningProgressState = {
  progress: {
    interactiveState: {
      recordsByKey: {} as Record<string, InteractiveStateRecord>,
    },
  },
}

let campaignProgressState = {
  challenges: {} as Record<string, { status: string; attempts: number; updatedAt: string }>,
}

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const completeMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)
const markChallengeInProgressMock = vi.fn()
const setChallengeStatusMock = vi.fn()
let lastUseCustomInteractionParams: Record<string, unknown> | null = null

vi.mock('@/features/learning/hooks/interactions/use-custom-interaction', () => ({
  useCustomInteraction: (params: Record<string, unknown>) => {
    lastUseCustomInteractionParams = params

    return {
      ...customInteractionState,
      saveDraft: saveDraftMock,
      submit: submitMock,
      complete: completeMock,
      reset: resetMock,
    }
  },
}))

vi.mock('@/features/learning/hooks/use-learning-progress', () => ({
  useLearningProgress: () => learningProgressState,
}))

vi.mock('../../hooks/use-campaign-progress', () => ({
  useCampaignProgress: () => ({
    progress: {
      challenges: campaignProgressState.challenges,
    },
    markChallengeInProgress: markChallengeInProgressMock,
    setChallengeStatus: setChallengeStatusMock,
  }),
}))

function createTrackedInteractionRecord(
  overrides: Partial<InteractiveStateRecord> = {},
): InteractiveStateRecord {
  return {
    key: overrides.key ?? `${PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId}::entity:87654321`,
    interactionId: overrides.interactionId ?? PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
    lessonId: overrides.lessonId ?? PRIMARIE_WEBSITE_LINK_INTERACTION.ownerChallengeSlug,
    kind: overrides.kind ?? 'custom',
    scope: overrides.scope ?? { type: 'entity', entityCui: '87654321' },
    completionRule: overrides.completionRule ?? { type: 'resolved' },
    phase: overrides.phase ?? 'pending',
    value: overrides.value ?? {
      kind: 'json',
      json: {
        value: { websiteUrl: 'https://example.com' },
      },
    },
    result: overrides.result ?? null,
    ...(overrides.review !== undefined ? { review: overrides.review } : {}),
    updatedAt: overrides.updatedAt ?? '2026-03-23T19:30:00.000Z',
    submittedAt: overrides.submittedAt ?? '2026-03-23T19:30:00.000Z',
  }
}

describe('use-campaign-challenge-form', () => {
  beforeEach(() => {
    lastUseCustomInteractionParams = null
    customInteractionState = {
      record: null,
      savedValue: null,
      phase: 'idle',
      lifecycle: {
        mode: 'async_review',
        status: 'idle',
        reviewStatus: null,
        feedbackText: null,
        outcome: null,
        isSubmitted: false,
        isSuccessful: false,
        isFailure: false,
        isPending: false,
        canRetry: false,
      },
      isCompleted: false,
    }
    learningProgressState = {
      progress: {
        interactiveState: {
          recordsByKey: {},
        },
      },
    }
    campaignProgressState = {
      challenges: {},
    }
    saveDraftMock.mockClear()
    submitMock.mockClear()
    completeMock.mockClear()
    resetMock.mockClear()
    markChallengeInProgressMock.mockClear()
    setChallengeStatusMock.mockClear()
  })

  it('defers draft persistence side effects until after the current call stack', async () => {
    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'async_review',
        entityCui: '87654321',
      }),
    )

    await act(async () => {
      const saveDraftPromise = result.current.saveDraft({ websiteUrl: 'https://example.com' })

      expect(saveDraftMock).not.toHaveBeenCalled()
      expect(markChallengeInProgressMock).not.toHaveBeenCalled()

      await saveDraftPromise
    })

    expect(saveDraftMock).toHaveBeenCalledWith({ websiteUrl: 'https://example.com' })
    expect(markChallengeInProgressMock).toHaveBeenCalledWith('civic-monitor-and-request')
  })

  it('submits async-review interactions through submit() and updates aggregate progress', async () => {
    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'async_review',
        entityCui: '87654321',
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

  it('completes immediate interactions through complete() and marks the challenge completed', async () => {
    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'immediate',
        entityCui: '87654321',
      }),
    )

    await act(async () => {
      await result.current.submit({ websiteUrl: 'https://example.com' })
    })

    expect(completeMock).toHaveBeenCalledWith({ websiteUrl: 'https://example.com' })
    expect(submitMock).not.toHaveBeenCalled()
    expect(setChallengeStatusMock).toHaveBeenCalledWith(
      'civic-monitor-and-request',
      'completed',
    )
  })

  it('derives a completed submitted state from an approved review', () => {
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
      lifecycle: {
        mode: 'async_review',
        status: 'passed',
        reviewStatus: 'approved',
        feedbackText: 'Looks good.',
        outcome: null,
        isSubmitted: true,
        isSuccessful: true,
        isFailure: false,
        isPending: false,
        canRetry: false,
      },
      isCompleted: false,
    }
    learningProgressState.progress.interactiveState.recordsByKey = {
      [`${PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId}::entity:87654321`]: createTrackedInteractionRecord({
        phase: 'resolved',
        review: {
          status: 'approved',
          reviewedAt: '2026-03-23T19:30:00.000Z',
          feedbackText: 'Looks good.',
        },
      }),
    }
    campaignProgressState.challenges = {
      'civic-monitor-and-request': {
        status: 'completed',
        attempts: 1,
        updatedAt: '2026-03-23T19:30:00.000Z',
      },
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'async_review',
        entityCui: '87654321',
      }),
    )

    expect(result.current.isSubmitted).toBe(true)
    expect(result.current.isCompleted).toBe(true)
    expect(result.current.submittedVariant).toBe('completed')
    expect(result.current.reviewStatus).toBe('approved')
    expect(result.current.reviewFeedbackText).toBe('Looks good.')
    expect(result.current.challengeStatus).toBe('completed')
  })

  it('keeps submitted review-required interactions pending while waiting for review', () => {
    customInteractionState = {
      record: {
        phase: 'pending',
        result: null,
        review: null,
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'pending',
      lifecycle: {
        mode: 'async_review',
        status: 'pending',
        reviewStatus: null,
        feedbackText: null,
        outcome: null,
        isSubmitted: true,
        isSuccessful: false,
        isFailure: false,
        isPending: true,
        canRetry: false,
      },
      isCompleted: false,
    }
    campaignProgressState.challenges = {
      'civic-monitor-and-request': {
        status: 'pending_review',
        attempts: 1,
        updatedAt: '2026-03-23T19:30:00.000Z',
      },
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'async_review',
        entityCui: '87654321',
      }),
    )

    expect(result.current.submittedVariant).toBe('pending_review')
    expect(result.current.reviewStatus).toBeNull()
    expect(result.current.reviewFeedbackText).toBeNull()
    expect(result.current.isSubmitted).toBe(true)
    expect(result.current.isCompleted).toBe(false)
    expect(result.current.challengeStatus).toBe('pending_review')
  })

  it('treats rejected reviews as retry-needed while keeping the submission visible', () => {
    customInteractionState = {
      record: {
        phase: 'failed',
        result: null,
        review: {
          status: 'rejected',
          reviewedAt: '2026-03-23T19:30:00.000Z',
          feedbackText: 'Please use the official website.',
        },
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'failed',
      lifecycle: {
        mode: 'async_review',
        status: 'failed',
        reviewStatus: 'rejected',
        feedbackText: 'Please use the official website.',
        outcome: null,
        isSubmitted: true,
        isSuccessful: false,
        isFailure: true,
        isPending: false,
        canRetry: true,
      },
      isCompleted: false,
    }
    learningProgressState.progress.interactiveState.recordsByKey = {
      [`${PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId}::entity:87654321`]: createTrackedInteractionRecord({
        phase: 'failed',
        review: {
          status: 'rejected',
          reviewedAt: '2026-03-23T19:30:00.000Z',
          feedbackText: 'Please use the official website.',
        },
      }),
    }
    campaignProgressState.challenges = {
      'civic-monitor-and-request': {
        status: 'in_progress',
        attempts: 1,
        updatedAt: '2026-03-23T19:30:00.000Z',
      },
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'async_review',
        entityCui: '87654321',
      }),
    )

    expect(result.current.submittedVariant).toBe('rejected')
    expect(result.current.reviewStatus).toBe('rejected')
    expect(result.current.reviewFeedbackText).toBe('Please use the official website.')
    expect(result.current.isSubmitted).toBe(true)
    expect(result.current.isCompleted).toBe(false)
    expect(result.current.challengeStatus).toBe('in_progress')
  })

  it('resets the owner challenge to not_started when no stronger sibling interaction remains', async () => {
    customInteractionState = {
      record: {
        phase: 'pending',
        result: null,
        review: null,
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'pending',
      lifecycle: {
        mode: 'async_review',
        status: 'pending',
        reviewStatus: null,
        feedbackText: null,
        outcome: null,
        isSubmitted: true,
        isSuccessful: false,
        isFailure: false,
        isPending: true,
        canRetry: false,
      },
      isCompleted: false,
    }
    learningProgressState.progress.interactiveState.recordsByKey = {
      [`${PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId}::entity:87654321`]: createTrackedInteractionRecord(),
    }
    campaignProgressState.challenges = {
      'civic-monitor-and-request': {
        status: 'pending_review',
        attempts: 1,
        updatedAt: '2026-03-23T19:30:00.000Z',
      },
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'async_review',
        entityCui: '87654321',
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
        incrementAttempts: false,
        emitAuditEvent: false,
      },
    )
  })

  it('keeps the strongest sibling interaction state when resetting one card', async () => {
    customInteractionState = {
      record: {
        phase: 'pending',
        result: null,
        review: null,
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'pending',
      lifecycle: {
        mode: 'async_review',
        status: 'pending',
        reviewStatus: null,
        feedbackText: null,
        outcome: null,
        isSubmitted: true,
        isSuccessful: false,
        isFailure: false,
        isPending: true,
        canRetry: false,
      },
      isCompleted: false,
    }
    learningProgressState.progress.interactiveState.recordsByKey = {
      [`${PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId}::entity:87654321`]: createTrackedInteractionRecord(),
      [`${BUDGET_DOCUMENT_LINK_INTERACTION.interactionId}::entity:87654321`]: createTrackedInteractionRecord({
        key: `${BUDGET_DOCUMENT_LINK_INTERACTION.interactionId}::entity:87654321`,
        interactionId: BUDGET_DOCUMENT_LINK_INTERACTION.interactionId,
        phase: 'resolved',
        value: {
          kind: 'json',
          json: {
            value: { documentUrl: 'https://example.com/document.pdf' },
          },
        },
        review: {
          status: 'approved',
          reviewedAt: '2026-03-24T09:00:00.000Z',
        },
        updatedAt: '2026-03-24T09:00:00.000Z',
      }),
    }
    campaignProgressState.challenges = {
      'civic-monitor-and-request': {
        status: 'pending_review',
        attempts: 2,
        updatedAt: '2026-03-23T19:30:00.000Z',
      },
    }

    const { result } = renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'async_review',
        entityCui: '87654321',
      }),
    )

    await act(async () => {
      await result.current.reset()
    })

    expect(setChallengeStatusMock).toHaveBeenCalledWith(
      'civic-monitor-and-request',
      'completed',
      {
        incrementAttempts: false,
        emitAuditEvent: false,
      },
    )
  })

  it('reconciles remote review outcomes without incrementing attempts or emitting audit events', () => {
    customInteractionState = {
      record: {
        phase: 'resolved',
        result: null,
        review: {
          status: 'approved',
          reviewedAt: '2026-03-24T09:00:00.000Z',
        },
      },
      savedValue: { websiteUrl: 'https://example.com' },
      phase: 'resolved',
      lifecycle: {
        mode: 'async_review',
        status: 'passed',
        reviewStatus: 'approved',
        feedbackText: null,
        outcome: null,
        isSubmitted: true,
        isSuccessful: true,
        isFailure: false,
        isPending: false,
        canRetry: false,
      },
      isCompleted: false,
    }
    learningProgressState.progress.interactiveState.recordsByKey = {
      [`${PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId}::entity:87654321`]: createTrackedInteractionRecord({
        phase: 'resolved',
        review: {
          status: 'approved',
          reviewedAt: '2026-03-24T09:00:00.000Z',
        },
        updatedAt: '2026-03-24T09:00:00.000Z',
      }),
    }
    campaignProgressState.challenges = {
      'civic-monitor-and-request': {
        status: 'pending_review',
        attempts: 1,
        updatedAt: '2026-03-23T19:30:00.000Z',
      },
    }

    renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'async_review',
        entityCui: '87654321',
      }),
    )

    expect(setChallengeStatusMock).toHaveBeenCalledWith(
      'civic-monitor-and-request',
      'completed',
      {
        incrementAttempts: false,
        emitAuditEvent: false,
      },
    )
  })

  it('uses the explicit route entityCui for the scoped interaction identity', () => {
    renderHook(() =>
      useCampaignChallengeForm<{ websiteUrl: string }>({
        ownerChallengeSlug: 'civic-monitor-and-request',
        interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
        lifecycleMode: 'async_review',
        entityCui: '87654321',
      }),
    )

    expect(lastUseCustomInteractionParams).toMatchObject({
      scopePolicy: 'entity',
      entityCui: '87654321',
      interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
    })
  })
})
