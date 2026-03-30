import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrimarieWebsiteLink } from './PrimarieWebsiteLink'

const formState = {
  savedValue: {
    websiteUrl: 'https://example.com',
    submittedAt: '2026-03-23T19:27:40.526Z',
  } as null | {
    websiteUrl: string
    submittedAt: string
  },
  phase: 'resolved',
  isSubmitted: true,
  isCompleted: false,
  challengeStatus: 'pending_review',
  reviewStatus: 'pending' as 'pending' | 'approved' | 'rejected',
  reviewFeedbackText: null as string | null,
  submittedVariant: 'pending_review' as 'pending_review' | 'completed' | 'rejected',
  entityCui: '4305857',
  saveDraft: vi.fn(async () => undefined),
  submit: vi.fn(async () => undefined),
  reset: vi.fn(async () => undefined),
}

vi.mock('./use-campaign-challenge-form', () => ({
  useCampaignChallengeForm: () => formState,
}))

describe('PrimarieWebsiteLink', () => {
  beforeEach(() => {
    formState.reviewStatus = 'pending'
    formState.reviewFeedbackText = null
    formState.submittedVariant = 'pending_review'
    formState.savedValue = {
      websiteUrl: 'https://example.com',
      submittedAt: '2026-03-23T19:27:40.526Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true
    formState.isCompleted = false
    formState.challengeStatus = 'pending_review'
    formState.saveDraft.mockClear()
    formState.submit.mockClear()
    formState.reset.mockClear()
  })

  it('blocks blank submissions', () => {
    formState.savedValue = null
    formState.phase = 'idle'
    formState.isSubmitted = false
    formState.challengeStatus = 'not_started'

    render(
      <PrimarieWebsiteLink ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit link' })
    const form = submitButton.closest('form')

    expect(submitButton).toBeDisabled()
    expect(form).not.toBeNull()

    fireEvent.submit(form as HTMLFormElement)

    expect(formState.submit).not.toHaveBeenCalled()
  })

  it('shows a submitted state for approved reviews', () => {
    formState.reviewStatus = 'approved'
    formState.submittedVariant = 'completed'

    render(
      <PrimarieWebsiteLink ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.queryByText('Pending review')).not.toBeInTheDocument()
  })

  it('shows review feedback for rejected reviews', () => {
    formState.reviewStatus = 'rejected'
    formState.reviewFeedbackText = 'Use the official primaria domain.'
    formState.submittedVariant = 'rejected'

    render(
      <PrimarieWebsiteLink ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Needs changes')).toBeInTheDocument()
    expect(screen.getByText('Use the official primaria domain.')).toBeInTheDocument()
  })

  it('reopens rejected submissions with the previous URL when trying again', () => {
    formState.reviewStatus = 'rejected'
    formState.reviewFeedbackText = 'Use the official primaria domain.'
    formState.submittedVariant = 'rejected'
    formState.reset.mockImplementation(async () => {
      formState.savedValue = null
      formState.phase = 'idle'
      formState.isSubmitted = false
      formState.challengeStatus = 'not_started'
      formState.reviewStatus = 'pending'
      formState.reviewFeedbackText = null
      formState.submittedVariant = 'pending_review'
    })

    const { rerender } = render(
      <PrimarieWebsiteLink ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(formState.reset).toHaveBeenCalledTimes(1)

    rerender(
      <PrimarieWebsiteLink ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByLabelText('Link to the official city hall website')).toHaveValue('https://example.com')
    expect(screen.queryByText('Needs changes')).not.toBeInTheDocument()
  })
})
