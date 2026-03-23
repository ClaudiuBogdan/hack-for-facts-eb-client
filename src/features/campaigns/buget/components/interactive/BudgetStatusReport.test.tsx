import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetStatusReport } from './BudgetStatusReport'

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)

vi.mock('./use-campaign-challenge-form', () => ({
  useCampaignChallengeForm: () => ({
    savedValue: null,
    phase: 'idle',
    isSubmitted: false,
    isCompleted: false,
    challengeStatus: 'not_started',
    entityCui: '12345678',
    saveDraft: saveDraftMock,
    submit: submitMock,
    reset: resetMock,
  }),
}))

describe('BudgetStatusReport', () => {
  beforeEach(() => {
    saveDraftMock.mockClear()
    submitMock.mockClear()
    resetMock.mockClear()
  })

  it('keeps submit disabled until a publication answer is selected', () => {
    render(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" />,
    )

    expect(
      screen.getByRole('button', { name: /report status/i }),
    ).toBeDisabled()
  })

  it('enables submit for unpublished and unknown publication states', () => {
    render(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" />,
    )

    const submitButton = screen.getByRole('button', { name: /report status/i })

    fireEvent.click(screen.getByText('No'))
    expect(submitButton).toBeEnabled()

    fireEvent.click(screen.getByText("I don't know"))
    expect(submitButton).toBeEnabled()
  })

  it('requires a stage when the budget is marked as published', () => {
    render(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" />,
    )

    const submitButton = screen.getByRole('button', { name: /report status/i })

    fireEvent.click(screen.getByText('Yes'))
    expect(submitButton).toBeDisabled()

    fireEvent.click(screen.getByText('Draft (public consultation)'))
    expect(submitButton).toBeEnabled()
  })

  it('enables submit once an approved stage is selected', () => {
    render(
      <BudgetStatusReport ownerChallengeSlug="civic-monitor-and-request" />,
    )

    const submitButton = screen.getByRole('button', { name: /report status/i })

    fireEvent.click(screen.getByText('Yes'))
    fireEvent.click(screen.getByText('Approved'))

    expect(submitButton).toBeEnabled()
  })
})
