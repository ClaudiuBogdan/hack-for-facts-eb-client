import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrimarieContactInfo } from './PrimarieContactInfo'

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)

const formState = {
  savedValue: null as null | {
    email: string | null
    phone: string | null
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

describe('PrimarieContactInfo', () => {
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
    formState.submittedVariant = 'pending_review'
  })

  it('renders the form with email and phone fields', () => {
    render(
      <PrimarieContactInfo ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('City hall contact info')).toBeInTheDocument()
    expect(screen.getByLabelText('City hall email')).toBeInTheDocument()
    expect(screen.getByLabelText('City hall phone (optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save contact details' })).toBeInTheDocument()
  })

  it('blocks blank submissions', () => {
    render(
      <PrimarieContactInfo ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    const submitButton = screen.getByRole('button', { name: 'Save contact details' })
    const form = submitButton.closest('form')

    expect(submitButton).toBeDisabled()
    expect(form).not.toBeNull()

    fireEvent.submit(form as HTMLFormElement)

    expect(submitMock).not.toHaveBeenCalled()
  })

  it('saves draft when typing into the email field', () => {
    render(
      <PrimarieContactInfo ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'test@example.ro' },
    })

    expect(saveDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.ro' }),
    )
  })

  it('submits the form with email and phone values', () => {
    render(
      <PrimarieContactInfo ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.change(screen.getByLabelText('City hall phone (optional)'), {
      target: { value: '+40712345678' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save contact details' }))

    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'primaria@example.ro',
        phone: '+40712345678',
        submittedAt: expect.any(String),
      }),
    )
  })

  it('shows review state when form is submitted', () => {
    formState.savedValue = {
      email: 'primaria@example.ro',
      phone: '+40712345678',
      submittedAt: '2026-03-23T19:00:00.000Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true

    render(
      <PrimarieContactInfo ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('City hall contact info')).toBeInTheDocument()
    expect(screen.getByText('primaria@example.ro')).toBeInTheDocument()
    expect(screen.getByText('+40712345678')).toBeInTheDocument()
    expect(screen.queryByLabelText('City hall email')).not.toBeInTheDocument()
  })

  it('shows Try again button for rejected submissions', () => {
    formState.savedValue = {
      email: 'bad@example.ro',
      phone: null,
      submittedAt: '2026-03-23T19:00:00.000Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true
    formState.reviewStatus = 'rejected'
    formState.reviewFeedbackText = 'Email address is incorrect.'
    formState.submittedVariant = 'rejected'

    render(
      <PrimarieContactInfo ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Needs changes')).toBeInTheDocument()
    expect(screen.getByText('Email address is incorrect.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
