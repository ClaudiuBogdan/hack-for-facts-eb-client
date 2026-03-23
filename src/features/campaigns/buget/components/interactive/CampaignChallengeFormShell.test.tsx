import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { CampaignChallengeFormShell } from './CampaignChallengeFormShell'

describe('CampaignChallengeFormShell', () => {
  it('renders a pending-review submitted state', () => {
    render(
      <CampaignChallengeFormShell
        title="Review item"
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
      screen.getByText('Your information has been recorded and is being reviewed.'),
    ).toBeInTheDocument()
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
