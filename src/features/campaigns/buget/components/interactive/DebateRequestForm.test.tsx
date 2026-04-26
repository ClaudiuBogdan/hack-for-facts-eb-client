import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DebateRequestForm } from './DebateRequestForm'
import { PLATFORM_CC_EMAILS } from './mailto-utils'
import type { UseDebateRequestAvailabilityResult } from '../../hooks/use-debate-request-availability'

const saveDraftMock = vi.fn(async () => undefined)
const submitMock = vi.fn(async () => undefined)
const resetMock = vi.fn(async () => undefined)
const windowOpenMock = vi.fn(() => ({
  location: { href: '' },
  close: vi.fn(),
}))
let customInteractionCalls: Array<Record<string, unknown>> = []
let availabilityState: UseDebateRequestAvailabilityResult

function createAvailabilityState(
  status: 'open' | 'closed_debate_took_place' | 'closed_deadline_expired' | 'closed_global_period_expired' = 'open',
  overrides: Partial<NonNullable<UseDebateRequestAvailabilityResult['availability']>> = {},
): UseDebateRequestAvailabilityResult {
  return {
    state: 'ready',
    isSubmittable: status === 'open',
    error: null,
    availability: {
      status,
      publicationDate: null,
      requestDeadlineDate: null,
      globalDeadlineDate: '2099-12-31',
      publicDebate: null,
      ...overrides,
    },
  }
}

const formState = {
  savedValue: null as null | {
    primariaEmail: string
    isNgo: boolean
    organizationName: string | null
    organizationLegalAddress: string | null
    organizationRegistrationNumber: string | null
    organizationFiscalCode: string | null
    legalRepresentativeName: string | null
    legalRepresentativeRole: string | null
    ngoSenderEmail: string | null
    preparedSubject: string | null
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

vi.mock('../../hooks/use-debate-request-availability', () => ({
  useDebateRequestAvailability: () => availabilityState,
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
    availabilityState = createAvailabilityState('open')
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
      organizationLegalAddress: null,
      organizationRegistrationNumber: null,
      organizationFiscalCode: null,
      legalRepresentativeName: null,
      legalRepresentativeRole: null,
      ngoSenderEmail: null,
      preparedSubject: null,
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
        interactionId: 'funky:interaction:city_hall_contact',
      }),
    )
  })

  it('persists the latest city hall email draft value', () => {
    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'first@example.ro' },
    })
    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'second@example.ro' },
    })

    expect(saveDraftMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        primariaEmail: 'second@example.ro',
      }),
    )
  })

  it('clears ngo-only fields in the saved draft when ngo mode is turned off', () => {
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
    fireEvent.click(screen.getByLabelText('Do you represent a legally established association?'))

    expect(screen.queryByLabelText('Association name')).not.toBeInTheDocument()
    expect(saveDraftMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isNgo: false,
        organizationName: null,
        organizationLegalAddress: null,
        organizationRegistrationNumber: null,
        organizationFiscalCode: null,
        legalRepresentativeName: null,
        legalRepresentativeRole: null,
        ngoSenderEmail: null,
        threadKey: null,
        preparedSubject: null,
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
    fireEvent.change(screen.getByLabelText('Registered office'), {
      target: { value: 'Str. Exemplu nr. 1, Cluj-Napoca' },
    })
    fireEvent.change(screen.getByLabelText('Registration number'), {
      target: { value: '12/A/2020' },
    })
    fireEvent.change(screen.getByLabelText('Fiscal code (CIF)'), {
      target: { value: '12345678' },
    })
    fireEvent.change(screen.getByLabelText('Legal representative name'), {
      target: { value: 'Ana Pop' },
    })
    fireEvent.change(screen.getByLabelText('Legal representative role'), {
      target: { value: 'Presedinte' },
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
        organizationLegalAddress: 'Str. Exemplu nr. 1, Cluj-Napoca',
        organizationRegistrationNumber: '12/A/2020',
        organizationFiscalCode: '12345678',
        legalRepresentativeName: 'Ana Pop',
        legalRepresentativeRole: 'Presedinte',
        ngoSenderEmail: 'ngo@example.com',
        preparedSubject: 'Cerere organizare dezbatere publica - 4305857 - buget local 2026',
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
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Registered office'), {
      target: { value: 'Str. Exemplu nr. 1, Cluj-Napoca' },
    })
    fireEvent.change(screen.getByLabelText('Registration number'), {
      target: { value: '12/A/2020' },
    })
    fireEvent.change(screen.getByLabelText('Fiscal code (CIF)'), {
      target: { value: '12345678' },
    })
    fireEvent.change(screen.getByLabelText('Legal representative name'), {
      target: { value: 'Ana Pop' },
    })
    fireEvent.change(screen.getByLabelText('Legal representative role'), {
      target: { value: 'Presedinte' },
    })
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()

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
    fireEvent.change(screen.getByLabelText('Registered office'), {
      target: { value: 'Str. Exemplu nr. 1, Cluj-Napoca' },
    })
    fireEvent.change(screen.getByLabelText('Registration number'), {
      target: { value: '12/A/2020' },
    })
    fireEvent.change(screen.getByLabelText('Fiscal code (CIF)'), {
      target: { value: '12345678' },
    })
    fireEvent.change(screen.getByLabelText('Legal representative name'), {
      target: { value: 'Ana Pop' },
    })
    fireEvent.change(screen.getByLabelText('Legal representative role'), {
      target: { value: 'Presedinte' },
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
    expect(screen.getAllByText(PLATFORM_CC_EMAILS.join(', ')).length).toBeGreaterThan(0)
    expect(
      screen.getByText((_, element) => element?.textContent === `Keep ${PLATFORM_CC_EMAILS.join(', ')} in CC so we can track the request`),
    ).toBeInTheDocument()

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
    fireEvent.change(screen.getByLabelText('Registered office'), {
      target: { value: 'Str. Exemplu nr. 1, Cluj-Napoca' },
    })
    fireEvent.change(screen.getByLabelText('Registration number'), {
      target: { value: '12/A/2020' },
    })
    fireEvent.change(screen.getByLabelText('Fiscal code (CIF)'), {
      target: { value: '12345678' },
    })
    fireEvent.change(screen.getByLabelText('Legal representative name'), {
      target: { value: 'Ana Pop' },
    })
    fireEvent.change(screen.getByLabelText('Legal representative role'), {
      target: { value: 'Presedinte' },
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

  it('shows helper text for the NGO legal fields', () => {
    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    fireEvent.change(screen.getByLabelText('City hall email'), {
      target: { value: 'primaria@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByLabelText('Do you represent a legally established association?'))

    expect(
      screen.getByText('Use the full official name exactly as it appears in the Register of Associations and Foundations.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Add the legal address from the NGO registration documents.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('This is the person who signs the request on behalf of the association.'),
    ).toBeInTheDocument()
  })

  it('shows the exact closed debate banner without active submit controls', () => {
    availabilityState = createAvailabilityState('closed_debate_took_place', {
      publicDebate: {
        date: '2026-04-10',
        time: '14:30',
        location: 'City hall meeting room',
        announcement_link: 'https://example.com/announcement',
        online_participation_link: 'https://example.com/online',
      },
    })

    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('The local budget debate has already taken place.')).toBeInTheDocument()
    expect(screen.getByText('City hall meeting room')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Official announcement/i })).toHaveAttribute(
      'href',
      'https://example.com/announcement',
    )
    expect(screen.queryByLabelText('City hall email')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request submission' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
  })

  it('shows disabled UI for an expired known 15-day window', () => {
    availabilityState = createAvailabilityState('closed_deadline_expired', {
      publicationDate: '2026-04-01',
      requestDeadlineDate: '2026-04-16',
    })

    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText(/The 15-day public debate request period has expired/)).toBeInTheDocument()
    expect(screen.getByText('Publication date')).toBeInTheDocument()
    expect(screen.getByText('Request deadline')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request submission' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('City hall email')).not.toBeInTheDocument()
  })

  it('keeps the active form open when the publication date is unknown and the global period is open', () => {
    availabilityState = createAvailabilityState('open', {
      publicationDate: null,
      requestDeadlineDate: null,
      globalDeadlineDate: '2099-12-31',
    })

    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByLabelText('City hall email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  it('does not allow try again or stale resend copy for a rejected submission after closure', () => {
    availabilityState = createAvailabilityState('closed_deadline_expired', {
      publicationDate: '2026-04-01',
      requestDeadlineDate: '2026-04-16',
    })
    formState.savedValue = {
      primariaEmail: 'primaria@example.ro',
      isNgo: false,
      organizationName: null,
      organizationLegalAddress: null,
      organizationRegistrationNumber: null,
      organizationFiscalCode: null,
      legalRepresentativeName: null,
      legalRepresentativeRole: null,
      ngoSenderEmail: null,
      preparedSubject: null,
      threadKey: null,
      submissionPath: 'request_platform',
      submittedAt: '2026-03-23T19:27:40.526Z',
    }
    formState.phase = 'resolved'
    formState.isSubmitted = true
    formState.reviewStatus = 'rejected'
    formState.reviewFeedbackText = 'Please correct the destination email.'
    formState.submittedVariant = 'rejected'

    render(
      <DebateRequestForm ownerChallengeSlug="civic-monitor-and-request" entityCui="4305857" />,
    )

    expect(screen.getByText('This submitted request was rejected, but new public debate requests are no longer available.')).toBeInTheDocument()
    expect(screen.getByText('Requests are closed, so this submission cannot be updated and sent again.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.queryByText('Update the submission and send it again.')).not.toBeInTheDocument()
  })
})
