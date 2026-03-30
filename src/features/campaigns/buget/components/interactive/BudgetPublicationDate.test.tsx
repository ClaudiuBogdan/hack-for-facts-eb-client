import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetPublicationDate } from './BudgetPublicationDate'

// Mock ResizeObserver for Radix UI components
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
    publicationDate: string | null
    sources: readonly { type: string; url: string | null }[]
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

describe('BudgetPublicationDate', () => {
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

  it('renders the form with date input and source options', () => {
    render(
      <BudgetPublicationDate ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Budget draft publication date')).toBeInTheDocument()
    expect(screen.getByLabelText('When was the budget draft published?')).toBeInTheDocument()
    expect(screen.getByText('City hall website')).toBeInTheDocument()
    expect(screen.getByText('Local press')).toBeInTheDocument()
    expect(screen.getByText('Social media')).toBeInTheDocument()
    expect(screen.getByText('Other source')).toBeInTheDocument()
  })

  it('keeps submit disabled until a publication date is provided', () => {
    render(
      <BudgetPublicationDate ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit information' })
    const form = submitButton.closest('form')

    expect(submitButton).toBeDisabled()
    expect(form).not.toBeNull()

    fireEvent.submit(form as HTMLFormElement)

    expect(submitMock).not.toHaveBeenCalled()
  })

  it('shows source URL input when a source is selected', () => {
    render(
      <BudgetPublicationDate ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.queryByLabelText(/Link: City hall website/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('City hall website'))

    expect(screen.getByLabelText(/Link: City hall website/)).toBeInTheDocument()
  })

  it('submits the form with date and selected source', () => {
    render(
      <BudgetPublicationDate ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('When was the budget draft published?'), {
      target: { value: '2026-03-15' },
    })
    fireEvent.click(screen.getByText('Local press'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit information' }))

    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publicationDate: '2026-03-15',
        sources: [{ type: 'press', url: null }],
        submittedAt: expect.any(String),
      }),
    )
  })

  it('toggles source off when clicked again', () => {
    render(
      <BudgetPublicationDate ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.click(screen.getByText('Social media'))
    expect(screen.getByLabelText(/Link: Social media/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Social media'))
    expect(screen.queryByLabelText(/Link: Social media/)).not.toBeInTheDocument()
  })

  it('shows review state when submitted', () => {
    formState.savedValue = {
      publicationDate: '2026-03-15',
      sources: [{ type: 'website', url: 'https://primaria.ro/buget' }],
      submittedAt: '2026-03-23T19:00:00.000Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true

    render(
      <BudgetPublicationDate ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Pending review')).toBeInTheDocument()
    expect(screen.queryByLabelText('When was the budget draft published?')).not.toBeInTheDocument()
  })
})
