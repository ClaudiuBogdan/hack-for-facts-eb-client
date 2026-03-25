import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { CampaignChallengeFormShell } from './CampaignChallengeFormShell'

describe('CampaignChallengeFormShell', () => {
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
      screen.getByText('Your submission is saved. The system will validate it before it counts toward this challenge.'),
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
