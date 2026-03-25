import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContestationBuilder } from './ContestationBuilder'

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)
let customInteractionCalls: Array<Record<string, unknown>> = []

const formState = {
  savedValue: null as null | {
    contestedItem: string
    reasoning: string
    impact: string
    proposedChange: string
    senderName: string | null
    submissionPath: 'send_email' | 'download_text' | null
    primariaEmail: string | null
    submittedAt: string | null
  },
  phase: 'idle' as 'idle' | 'pending' | 'resolved',
  isSubmitted: false,
  isCompleted: false,
  challengeStatus: 'not_started',
  reviewStatus: null as null | 'pending' | 'approved' | 'rejected',
  reviewFeedbackText: null as string | null,
  submittedVariant: 'pending_review' as 'pending_review' | 'completed' | 'rejected',
  entityCui: '4305857',
  saveDraft: saveDraftMock,
  submit: submitMock,
  reset: resetMock,
}

vi.mock('./use-campaign-challenge-form', () => ({
  useCampaignChallengeForm: () => formState,
}))

vi.mock('@/features/learning/hooks/interactions/use-custom-interaction', () => ({
  useCustomInteraction: (params: Record<string, unknown>) => {
    customInteractionCalls.push(params)
    return {
      savedValue: null,
    }
  },
}))

describe('ContestationBuilder', () => {
  beforeEach(() => {
    saveDraftMock.mockClear()
    submitMock.mockClear()
    resetMock.mockClear()
    customInteractionCalls = []
    formState.savedValue = null
    formState.phase = 'idle'
    formState.isSubmitted = false
    formState.isCompleted = false
    formState.challengeStatus = 'not_started'
    formState.reviewStatus = null
    formState.reviewFeedbackText = null
    formState.submittedVariant = 'pending_review'
  })

  it('returns rejected contestations to step 1 while preserving the previous draft', () => {
    const { rerender } = render(
      <ContestationBuilder ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('What are you contesting?'), {
      target: { value: 'Personnel expenses - Chapter 65 Education' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    fireEvent.change(screen.getByLabelText('Why?'), {
      target: { value: 'The allocation grew faster than student outcomes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    fireEvent.change(screen.getByLabelText('What is the impact?'), {
      target: { value: 'It reduces the funds available for school repairs.' },
    })
    fireEvent.change(screen.getByLabelText('What change do you propose?'), {
      target: { value: 'Move 500,000 lei to school infrastructure investments.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByLabelText('Your name or organization')).toBeInTheDocument()

    formState.savedValue = {
      contestedItem: 'Personnel expenses - Chapter 65 Education',
      reasoning: 'The allocation grew faster than student outcomes.',
      impact: 'It reduces the funds available for school repairs.',
      proposedChange: 'Move 500,000 lei to school infrastructure investments.',
      senderName: 'Civic Group',
      submissionPath: 'download_text',
      primariaEmail: 'primaria@example.ro',
      submittedAt: '2026-03-23T19:27:40.526Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true
    formState.reviewStatus = 'rejected'
    formState.reviewFeedbackText = 'Please make the proposed change more concrete.'
    formState.submittedVariant = 'rejected'
    resetMock.mockImplementation(async () => {
      formState.savedValue = null
      formState.phase = 'idle'
      formState.isSubmitted = false
      formState.challengeStatus = 'not_started'
      formState.reviewStatus = null
      formState.reviewFeedbackText = null
      formState.submittedVariant = 'pending_review'
    })

    rerender(
      <ContestationBuilder ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(resetMock).toHaveBeenCalledTimes(1)

    rerender(
      <ContestationBuilder ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByLabelText('What are you contesting?')).toHaveValue(
      'Personnel expenses - Chapter 65 Education',
    )
    expect(screen.queryByLabelText('Your name or organization')).not.toBeInTheDocument()
  })

  it('uses the explicit route entity for debate and contact info lookups', () => {
    render(
      <ContestationBuilder ownerChallengeSlug="civic-monitor-and-request" entityCui="87654321" />,
    )

    expect(customInteractionCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scopePolicy: 'entity',
          entityCui: '87654321',
          interactionId: 'campaign:debate-request',
        }),
        expect.objectContaining({
          scopePolicy: 'entity',
          entityCui: '87654321',
          interactionId: 'campaign:primarie-contact-info',
        }),
      ]),
    )
  })
})
