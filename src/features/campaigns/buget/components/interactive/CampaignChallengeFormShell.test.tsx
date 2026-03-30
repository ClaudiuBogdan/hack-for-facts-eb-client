import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { CampaignChallengeFormShell } from './CampaignChallengeFormShell'

describe('CampaignChallengeFormShell', () => {
  it('does not submit when disabled, even via form submit', () => {
    const onSubmit = vi.fn()

    render(
      <CampaignChallengeFormShell
        title="Review item"
        isSubmitted={false}
        onSubmit={onSubmit}
        isSubmitDisabled={true}
      >
        <div>content</div>
      </CampaignChallengeFormShell>,
    )

    const submitButton = screen.getByRole('button', { name: 'Submit' })
    const form = submitButton.closest('form')

    expect(submitButton).toBeDisabled()
    expect(form).not.toBeNull()

    fireEvent.submit(form as HTMLFormElement)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders a pending-review submitted state', () => {
    render(
      <CampaignChallengeFormShell
        title="Review item"
        submittedSummaryItems={[
          {
            label: 'Submitted value',
            value: 'https://example.com',
          },
        ]}
        isSubmitted={true}
        submittedVariant="pending_review"
        onSubmit={() => {}}
        isSubmitDisabled={false}
      >
        <div>content</div>
      </CampaignChallengeFormShell>,
    )

    expect(screen.getByText('Pending review')).toBeInTheDocument()
    expect(
      screen.getByText('Your submission is saved and waiting for review.'),
    ).toBeInTheDocument()
    expect(screen.getByText('What you submitted')).toBeInTheDocument()
    expect(screen.getByText('Submitted value')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders an approved submitted state', () => {
    render(
      <CampaignChallengeFormShell
        title="Review item"
        isSubmitted={true}
        submittedVariant="completed"
        onSubmit={() => {}}
        isSubmitDisabled={false}
      >
        <div>content</div>
      </CampaignChallengeFormShell>,
    )

    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.queryByText('Pending review')).not.toBeInTheDocument()
    expect(screen.getByText('Your submission has been reviewed and accepted.')).toBeInTheDocument()
  })

  it('renders rejection feedback when review fails', () => {
    const onTryAgain = vi.fn()

    render(
      <CampaignChallengeFormShell
        title="Review item"
        isSubmitted={true}
        submittedVariant="rejected"
        feedbackText="Please add a source link."
        onTryAgain={onTryAgain}
        onSubmit={() => {}}
        isSubmitDisabled={false}
      >
        <div>content</div>
      </CampaignChallengeFormShell>,
    )

    expect(screen.getByText('Needs changes')).toBeInTheDocument()
    expect(screen.getByText('Please add a source link.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onTryAgain).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })
})
