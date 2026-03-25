import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetDocumentLink } from './BudgetDocumentLink'

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)

const formState = {
  savedValue: null as null | {
    documentUrl: string
    documentType: 'pdf' | 'word' | 'excel' | 'webpage' | 'graphics' | 'other' | null
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

  it('renders the extended document-type options and submits the selected type', () => {
    render(
      <BudgetDocumentLink ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('Word')).toBeInTheDocument()
    expect(screen.getByText('Excel')).toBeInTheDocument()
    expect(screen.getByText('Graphics')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Link to the budget document'), {
      target: { value: 'https://example.ro/buget-2026.xlsx' },
    })
    fireEvent.click(screen.getByText('Excel'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit link' }))

    expect(saveDraftMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        documentUrl: 'https://example.ro/buget-2026.xlsx',
        documentType: 'excel',
      }),
    )
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        documentUrl: 'https://example.ro/buget-2026.xlsx',
        documentType: 'excel',
        submittedAt: expect.any(String),
      }),
    )
  })
})
