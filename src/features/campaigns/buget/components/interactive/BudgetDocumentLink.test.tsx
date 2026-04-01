import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetDocumentLink } from './BudgetDocumentLink'

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = ResizeObserverMock

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)

const formState = {
  savedValue: null as null | {
    documentUrl: string
    documentTypes?: readonly ('pdf' | 'word' | 'excel' | 'webpage' | 'graphics' | 'other')[]
    documentType?: 'pdf' | 'word' | 'excel' | 'webpage' | 'graphics' | 'other' | null
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

describe('BudgetDocumentLink', () => {
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

  it('blocks blank submissions', () => {
    render(
      <BudgetDocumentLink ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit link' })
    const form = submitButton.closest('form')

    expect(submitButton).toBeDisabled()
    expect(form).not.toBeNull()

    fireEvent.submit(form as HTMLFormElement)

    expect(submitMock).not.toHaveBeenCalled()
  })

  it('renders the extended document-type options and submits all selected types', () => {
    render(
      <BudgetDocumentLink ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Word')).toBeInTheDocument()
    expect(screen.getByText('Excel')).toBeInTheDocument()
    expect(screen.getByText('Graphics')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Link to the budget document'), {
      target: { value: 'https://example.ro/buget-2026.xlsx' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Graphics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit link' }))

    expect(saveDraftMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        documentUrl: 'https://example.ro/buget-2026.xlsx',
        documentTypes: ['excel', 'graphics'],
      }),
    )
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        documentUrl: 'https://example.ro/buget-2026.xlsx',
        documentTypes: ['excel', 'graphics'],
        submittedAt: expect.any(String),
      }),
    )
  })

  it('hydrates legacy single-value documentType records into the multi-select summary', () => {
    formState.savedValue = {
      documentUrl: 'https://example.ro/buget-2026.pdf',
      documentType: 'pdf',
      submittedAt: '2026-04-01T10:00:00.000Z',
    }
    formState.isSubmitted = true

    render(
      <BudgetDocumentLink ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('Document types')).toBeInTheDocument()
  })
})
