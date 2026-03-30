import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetStatusReport } from './BudgetStatusReport'

// Mock ResizeObserver for Radix UI components (RadioGroup uses useSize internally)
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
    isPublished: 'yes' | 'no' | 'dont_know' | null
    budgetStage: 'draft' | 'approved' | null
    submittedAt: string | null
  },
  phase: 'idle' as 'idle' | 'pending' | 'resolved',
  isSubmitted: false,
  isCompleted: false,
  challengeStatus: 'not_started',
  reviewStatus: null as null | 'pending' | 'approved' | 'rejected',
  reviewFeedbackText: null as string | null,
  submittedVariant: 'pending_review' as 'pending_review' | 'completed' | 'rejected',
  entityCui: '12345678',
  saveDraft: saveDraftMock,
  submit: submitMock,
  reset: resetMock,
}

vi.mock('./use-campaign-challenge-form', () => ({
  useCampaignChallengeForm: () => formState,
}))

describe('BudgetStatusReport', () => {
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

  it('keeps submit disabled until a publication answer is selected', () => {
    render(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(
      screen.getByRole('button', { name: /report status/i }),
    ).toBeDisabled()
  })

  it('enables submit for unpublished and unknown publication states', () => {
    render(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    const submitButton = screen.getByRole('button', { name: /report status/i })

    fireEvent.click(screen.getByText('No'))
    expect(submitButton).toBeEnabled()

    fireEvent.click(screen.getByText("I don't know"))
    expect(submitButton).toBeEnabled()
  })

  it('requires a stage when the budget is marked as published', () => {
    render(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    const submitButton = screen.getByRole('button', { name: /report status/i })

    expect(screen.queryByText('What stage is it in?')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Yes'))
    expect(screen.getByText('What stage is it in?')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    fireEvent.click(screen.getByText('Draft (public consultation)'))
    expect(submitButton).toBeEnabled()
  })

  it('enables submit once an approved stage is selected', () => {
    render(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    const submitButton = screen.getByRole('button', { name: /report status/i })

    fireEvent.click(screen.getByText('Yes'))
    fireEvent.click(screen.getByText('Approved'))

    expect(submitButton).toBeEnabled()
  })

  it('reopens rejected submissions with the previous answers when trying again', () => {
    formState.savedValue = {
      isPublished: 'yes',
      budgetStage: 'approved',
      submittedAt: '2026-03-23T19:27:40.526Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true
    formState.reviewStatus = 'rejected'
    formState.reviewFeedbackText = 'Please verify the status.'
    formState.submittedVariant = 'rejected'
    resetMock.mockImplementation(async () => {
      formState.savedValue = null
      formState.phase = 'idle'
      formState.isSubmitted = false
      formState.reviewStatus = null
      formState.reviewFeedbackText = null
      formState.submittedVariant = 'pending_review'
    })

    const { rerender } = render(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(resetMock).toHaveBeenCalledTimes(1)

    rerender(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('What stage is it in?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /report status/i })).toBeEnabled()
    expect(screen.queryByText('Needs changes')).not.toBeInTheDocument()
  })
})
