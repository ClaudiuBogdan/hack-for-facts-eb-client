import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ParticipationReport } from './ParticipationReport'

// Mock ResizeObserver for Radix UI RadioGroup
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)

const formState = {
  savedValue: null as null | {
    debateTookPlace: 'yes' | 'no' | 'dont_know' | null
    approximateAttendees: number | null
    citizensAllowedToSpeak: 'yes' | 'no' | 'partially' | null
    citizenInputsRecorded: 'yes' | 'no' | 'dont_know' | null
    observations: string | null
    submittedAt: string | null
  },
  phase: 'idle' as 'idle' | 'pending' | 'resolved',
  isSubmitted: false,
  isCompleted: false,
  challengeStatus: 'not_started',
  reviewStatus: null as null | 'pending' | 'approved' | 'rejected',
  reviewFeedbackText: null as string | null,
  submittedVariant: 'completed' as 'pending_review' | 'completed' | 'rejected',
  entityCui: '4305857',
  saveDraft: saveDraftMock,
  submit: submitMock,
  reset: resetMock,
}

vi.mock('./use-campaign-challenge-form', () => ({
  useCampaignChallengeForm: () => formState,
}))

describe('ParticipationReport', () => {
  beforeEach(() => {
    saveDraftMock.mockClear()
    submitMock.mockClear()
    resetMock.mockClear()
    formState.savedValue = null
    formState.phase = 'idle'
    formState.isSubmitted = false
    formState.isCompleted = false
    formState.challengeStatus = 'not_started'
    formState.reviewStatus = null
    formState.reviewFeedbackText = null
    formState.submittedVariant = 'completed'
  })

  it('renders the form with debate question and observations', () => {
    render(
      <ParticipationReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Participation report')).toBeInTheDocument()
    expect(screen.getByText('Did the debate take place?')).toBeInTheDocument()
    expect(screen.getByLabelText('Observations (optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit report' })).toBeInTheDocument()
  })

  it('keeps submit disabled until a debate answer is selected', () => {
    render(
      <ParticipationReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit report' })
    const form = submitButton.closest('form')

    expect(submitButton).toBeDisabled()
    expect(form).not.toBeNull()

    fireEvent.submit(form as HTMLFormElement)

    expect(submitMock).not.toHaveBeenCalled()
  })

  it('shows follow-up questions only when debate is "yes"', () => {
    render(
      <ParticipationReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.queryByText('Were citizens allowed to speak?')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Approximate number of attendees')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Yes'))

    expect(screen.getByText('Were citizens allowed to speak?')).toBeInTheDocument()
    expect(screen.getByText('Were citizen contributions recorded?')).toBeInTheDocument()
    expect(screen.getByLabelText('Approximate number of attendees')).toBeInTheDocument()
  })

  it('hides follow-up questions when switching from "yes" to "no"', () => {
    render(
      <ParticipationReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.click(screen.getByText('Yes'))
    expect(screen.getByText('Were citizens allowed to speak?')).toBeInTheDocument()

    // Multiple "No" labels exist across radio groups, so scope to the debate fieldset.
    const debateGroup = screen.getByRole('group', { name: 'Did the debate take place?' })
    fireEvent.click(within(debateGroup).getByText('No'))
    expect(screen.queryByText('Were citizens allowed to speak?')).not.toBeInTheDocument()
  })

  it('submits the form with debate answers', () => {
    render(
      <ParticipationReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.click(screen.getByText('No'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        debateTookPlace: 'no',
        submittedAt: expect.any(String),
      }),
    )
  })

  it('shows review state when submitted with completed variant', () => {
    formState.savedValue = {
      debateTookPlace: 'yes',
      approximateAttendees: 50,
      citizensAllowedToSpeak: 'yes',
      citizenInputsRecorded: 'yes',
      observations: 'Good debate',
      submittedAt: '2026-03-23T19:00:00.000Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true

    render(
      <ParticipationReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.queryByText('Did the debate take place?')).not.toBeInTheDocument()
  })

  it('shows rejected state with feedback and try again button', () => {
    formState.savedValue = {
      debateTookPlace: 'yes',
      approximateAttendees: null,
      citizensAllowedToSpeak: null,
      citizenInputsRecorded: null,
      observations: null,
      submittedAt: '2026-03-23T19:00:00.000Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true
    formState.reviewStatus = 'rejected'
    formState.reviewFeedbackText = 'Please add more details.'
    formState.submittedVariant = 'rejected'

    render(
      <ParticipationReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Needs changes')).toBeInTheDocument()
    expect(screen.getByText('Please add more details.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
