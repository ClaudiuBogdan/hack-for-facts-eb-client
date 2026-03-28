import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DebateRequestForm } from './DebateRequestForm'

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)
const preparePublicDebateSelfSendMock = vi
  .fn<(params: unknown) => Promise<{
    created: boolean
    existingThread: null
    threadKey: string
    captureAddress: string
    subject: string
    body: string
    cc: string[]
  }>>()
  .mockResolvedValue({
    created: true,
    existingThread: null,
    threadKey: 'thread-key-1',
    captureAddress: 'contact@transparenta.eu',
    subject: 'Prepared subject [teu:thread-key-1]',
    body: 'Prepared body',
    cc: ['contact@transparenta.eu'],
  })
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

vi.mock('../../api/institution-correspondence', () => ({
  preparePublicDebateSelfSend: (params: unknown) => preparePublicDebateSelfSendMock(params),
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
    preparePublicDebateSelfSendMock.mockClear()
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

  it('prepares the self-send email and persists threadKey plus ngoSenderEmail on submit', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Open email' }))

    await waitFor(() => {
      expect(preparePublicDebateSelfSendMock).toHaveBeenCalledWith({
        entityCui: '4305857',
        institutionEmail: 'primaria@example.ro',
        requesterOrganizationName: 'Asociatia Test',
        consentCapturedAt: null,
      })
    })

    expect(windowOpenMock).toHaveBeenCalledWith('', '_blank')

    await waitFor(() => {
      expect(saveDraftMock).toHaveBeenCalledWith(
        expect.objectContaining({
          threadKey: 'thread-key-1',
        }),
      )
    })

    // Verify the mailto URL was set on the opened window
    const openedWindow = windowOpenMock.mock.results[0]?.value as { location: { href: string } }
    expect(openedWindow.location.href).toContain('mailto:')
    expect(openedWindow.location.href).toContain(encodeURIComponent('Prepared subject [teu:thread-key-1]'))
    expect(openedWindow.location.href).toContain(encodeURIComponent('Prepared body'))

    fireEvent.click(screen.getByRole('button', { name: 'I sent the email' }))

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith({
        primariaEmail: 'primaria@example.ro',
        isNgo: true,
        organizationName: 'Asociatia Test',
        ngoSenderEmail: 'ngo@example.com',
        threadKey: 'thread-key-1',
        submissionPath: 'send_yourself',
        submittedAt: expect.any(String),
      })
    })
  })

  it('requests association email only for NGO self-send and not for platform delivery', () => {
    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.queryByLabelText('Association email')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByLabelText('Do you represent a legally established association?'))
    fireEvent.change(screen.getByLabelText('Association name'), {
      target: { value: 'Asociatia Test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByLabelText('Association email')).toBeInTheDocument()
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

  it('closes the blank window and shows error when prepare API fails', async () => {
    preparePublicDebateSelfSendMock.mockRejectedValueOnce(new Error('Server unavailable'))

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
    fireEvent.click(screen.getByRole('button', { name: 'Open email' }))

    await waitFor(() => {
      expect(screen.getByText('Server unavailable')).toBeInTheDocument()
    })

    // The blank window should have been closed
    const openedWindow = windowOpenMock.mock.results[0]?.value as { close: ReturnType<typeof vi.fn> }
    expect(openedWindow.close).toHaveBeenCalled()

    // "I sent the email" should not appear since prepare failed
    expect(screen.queryByRole('button', { name: 'I sent the email' })).not.toBeInTheDocument()
  })

  it('disables the open email button while preparing', async () => {
    let resolvePrep: ((value: { created: boolean; existingThread: null; threadKey: string; captureAddress: string; subject: string; body: string; cc: string[] }) => void) | null = null
    preparePublicDebateSelfSendMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolvePrep = resolve }),
    )

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
    fireEvent.click(screen.getByRole('button', { name: 'Open email' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Preparing email...' })).toBeDisabled()
    })

    // Resolve the prepare call to clean up
    const resolve = resolvePrep as unknown as (value: { created: boolean; existingThread: null; threadKey: string; captureAddress: string; subject: string; body: string; cc: string[] }) => void
    resolve({
      created: true,
      existingThread: null,
      threadKey: 'thread-key-1',
      captureAddress: 'contact@transparenta.eu',
      subject: 'Subject',
      body: 'Body',
      cc: [],
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open email again' })).toBeEnabled()
    })
  })
})
