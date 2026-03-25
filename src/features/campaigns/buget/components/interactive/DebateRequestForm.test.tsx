import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DebateRequestForm } from './DebateRequestForm'

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)
let customInteractionCalls: Array<Record<string, unknown>> = []

const formState = {
  savedValue: null as null | {
    primariaEmail: string
    isNgo: boolean
    organizationName: string | null
    submissionPath: 'send_yourself' | 'request_platform' | null
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

describe('DebateRequestForm', () => {
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

  it('returns rejected submissions to step 1 while preserving the previous answers', () => {
    const { rerender } = render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(
      screen.getByText('Choose how you want the public debate request to be sent.'),
    ).toBeInTheDocument()

    formState.savedValue = {
      primariaEmail: 'primaria@example.ro',
      isNgo: false,
      organizationName: null,
      submissionPath: 'request_platform',
      submittedAt: '2026-03-23T19:27:40.526Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true
    formState.reviewStatus = 'rejected'
    formState.reviewFeedbackText = 'Please correct the destination email.'
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
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(resetMock).toHaveBeenCalledTimes(1)

    rerender(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByLabelText('City hall email')).toHaveValue('primaria@example.ro')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    expect(
      screen.queryByText('Choose how you want the public debate request to be sent.'),
    ).not.toBeInTheDocument()
  })

  it('uses the explicit route entity for contact info lookups', () => {
    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="87654321" />,
    )

    expect(customInteractionCalls).toContainEqual(
      expect.objectContaining({
        scopePolicy: 'entity',
        entityCui: '87654321',
        interactionId: 'campaign:primarie-contact-info',
      }),
    )
  })
})
