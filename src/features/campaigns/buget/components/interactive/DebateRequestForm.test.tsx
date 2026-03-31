import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DebateRequestForm } from './DebateRequestForm'

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)
const windowOpenMock = vi.fn(() => ({
  location: { href: '' },
  close: vi.fn(),
}))
let customInteractionCalls: Array<Record<string, unknown>> = []

const formState = {
  savedValue: null as null | {
    primariaEmail: string
    isNgo: boolean
    organizationName: string | null
    ngoSenderEmail: string | null
    threadKey: string | null
    submissionPath: 'send_yourself' | 'request_platform' | null
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

vi.mock('@/features/learning/hooks/interactions/use-custom-interaction', () => ({
  useCustomInteraction: (params: Record<string, unknown>) => {
    customInteractionCalls.push(params)
    return {
      savedValue: null,
    }
  },
}))

describe('DebateRequestForm', () => {
  beforeEach(() => {
    saveDraftMock.mockClear()
    submitMock.mockClear()
    resetMock.mockClear()
    customInteractionCalls = []
    windowOpenMock.mockClear()
    vi.stubGlobal('open', windowOpenMock)
    formState.savedValue = null
    formState.phase = 'idle'
    formState.isSubmitted = false
    formState.isCompleted = false
    formState.challengeStatus = 'not_started'
    formState.reviewStatus = null
    formState.reviewFeedbackText = null
    formState.submittedVariant = 'pending_review'
  })

  it('returns rejected submissions to step 1 while preserving the previous answers', () => {
    const { rerender } = render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(
      screen.getByText('Choose how you want the public debate request to be sent.'),
    ).toBeInTheDocument()

    formState.savedValue = {
      primariaEmail: 'primaria@example.ro',
      isNgo: false,
      organizationName: null,
      ngoSenderEmail: null,
      threadKey: null,
      submissionPath: 'request_platform',
      submittedAt: '2026-03-23T19:27:40.526Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true
    formState.reviewStatus = 'rejected'
    formState.reviewFeedbackText = 'Please correct the destination email.'
    formState.submittedVariant = 'rejected'
    resetMock.mockImplementation(async () => {
      formState.savedValue = null
      formState.phase = 'idle'
      formState.isSubmitted = false
      formState.challengeStatus = 'not_started'
      formState.reviewStatus = null
      formState.reviewFeedbackText = null
      formState.submittedVariant = 'pending_review'
    })

    rerender(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(resetMock).toHaveBeenCalledTimes(1)

    rerender(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByLabelText('City hall email')).toHaveValue('primaria@example.ro')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    expect(
      screen.queryByText('Choose how you want the public debate request to be sent.'),
    ).not.toBeInTheDocument()
  })

  it('uses the explicit route entity for contact info lookups', () => {
    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="87654321" />,
    )

    expect(customInteractionCalls).toContainEqual(
      expect.objectContaining({
        scopePolicy: 'entity',
        entityCui: '87654321',
        interactionId: 'campaign:primarie-contact-info',
      }),
    )
  })

  it('shows email preview and submits self-send with ngoSenderEmail', async () => {
    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByLabelText('Do you represent a legally established association?'))
    fireEvent.change(screen.getByLabelText('Association name'), {
      target: { value: 'Asociatia Test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    fireEvent.change(screen.getByLabelText('Association email'), {
      target: { value: 'ngo@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare email' }))

    // Email preview should be visible
    expect(screen.getByText('Prepared email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open email client' })).toBeInTheDocument()

    // Open email client triggers mailto
    fireEvent.click(screen.getByRole('button', { name: 'Open email client' }))
    expect(windowOpenMock).toHaveBeenCalledWith(
      expect.stringContaining('mailto:'),
      '_blank',
    )

    // Confirm sending
    fireEvent.click(screen.getByRole('button', { name: 'I sent the email' }))

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith({
        primariaEmail: 'primaria@example.ro',
        isNgo: true,
        organizationName: 'Asociatia Test',
        ngoSenderEmail: 'ngo@example.com',
        threadKey: null,
        submissionPath: 'send_yourself',
        submittedAt: expect.any(String),
      })
    })
  })

  it('requires association email only for NGO self-send and not for platform delivery', () => {
    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // Non-NGO: no association email field, prepare email is disabled
    expect(screen.queryByLabelText('Association email')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prepare email' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByLabelText('Do you represent a legally established association?'))
    fireEvent.change(screen.getByLabelText('Association name'), {
      target: { value: 'Asociatia Test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // NGO: association email field is visible, prepare email still disabled without valid email
    expect(screen.getByLabelText('Association email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prepare email' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Association email'), {
      target: { value: 'invalid-email' },
    })
    expect(screen.getByRole('button', { name: 'Prepare email' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Association email'), {
      target: { value: 'ngo@example.com' },
    })
    expect(screen.getByRole('button', { name: 'Prepare email' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Request submission' })).toBeEnabled()
  })

  it('shows an error and keeps the form active when submit fails', async () => {
    submitMock.mockRejectedValueOnce(new Error('Network error'))

    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    fireEvent.click(screen.getByRole('button', { name: 'Request submission' }))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    // Form should still be interactive (not in submitted state)
    expect(screen.getByRole('button', { name: 'Request submission' })).toBeEnabled()
  })

  it('shows email preview with prepared content after clicking prepare email', () => {
    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByLabelText('Do you represent a legally established association?'))
    fireEvent.change(screen.getByLabelText('Association name'), {
      target: { value: 'Asociatia Test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    fireEvent.change(screen.getByLabelText('Association email'), {
      target: { value: 'ngo@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Prepare email' }))

    // Email preview should be visible with recipient and action buttons
    expect(screen.getByText('Prepared email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open email client' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'I sent the email' })).toBeInTheDocument()

    // Path selection cards should be hidden while preview is visible
    expect(screen.queryByText('Send it yourself')).not.toBeInTheDocument()
  })

  it('disables prepare email button when association email is missing or invalid', () => {
    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByLabelText('Do you represent a legally established association?'))
    fireEvent.change(screen.getByLabelText('Association name'), {
      target: { value: 'Asociatia Test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // No email yet: disabled
    expect(screen.getByRole('button', { name: 'Prepare email' })).toBeDisabled()

    // Invalid email: still disabled
    fireEvent.change(screen.getByLabelText('Association email'), {
      target: { value: 'not-an-email' },
    })
    expect(screen.getByRole('button', { name: 'Prepare email' })).toBeDisabled()

    // Valid email: enabled
    fireEvent.change(screen.getByLabelText('Association email'), {
      target: { value: 'ngo@example.com' },
    })
    expect(screen.getByRole('button', { name: 'Prepare email' })).toBeEnabled()
  })
})
