import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type ReactNode, useState } from 'react'
import { CampaignAdminUserInteractionsPage } from './CampaignAdminUserInteractionsPage'
import type {
  CampaignAdminQueueSearch,
  CampaignAdminMetaResponse,
  CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'

const useAuthMock = vi.fn()
const useCampaignAdminInteractionMetaQueryMock = vi.fn()
const useCampaignAdminQueueQueryMock = vi.fn()
const useSubmitCampaignAdminReviewsMutationMock = vi.fn()
const mutateAsyncMock = vi.fn()
const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
const clipboardWriteTextMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/ResponsivePopover', () => ({
  ResponsivePopover: ({ trigger, content }: { trigger: ReactNode; content: ReactNode }) => (
    <div>
      {trigger}
      <div>{content}</div>
    </div>
  ),
}))

vi.mock('@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions', () => ({
  useCampaignAdminInteractionMetaQuery: (...args: unknown[]) =>
    useCampaignAdminInteractionMetaQueryMock(...args),
  useCampaignAdminQueueQuery: (...args: unknown[]) => useCampaignAdminQueueQueryMock(...args),
  useSubmitCampaignAdminReviewsMutation: (...args: unknown[]) =>
    useSubmitCampaignAdminReviewsMutationMock(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

const defaultSearch: CampaignAdminQueueSearch = {
  limit: 50,
}
const riskyApprovalValidationMessage =
  'Approved rows with institution-email risk flags need explicit confirmation before saving.'

function createItem(
  overrides: Partial<CampaignAdminUserInteractionListItem> = {}
): CampaignAdminUserInteractionListItem {
  return {
    userId: 'user-1',
    recordKey: 'funky:interaction:public_debate_request::entity:12345678',
    campaignKey: 'funky',
    interactionId: 'funky:interaction:public_debate_request',
    lessonId: 'civic-monitor-and-request',
    entityCui: '12345678',
    entityName: 'Oras Test',
    scopeType: 'entity',
    phase: 'pending',
    reviewStatus: 'pending',
    pendingReason: 'awaiting_manual_review',
    submittedAt: '2026-04-10T10:00:00.000Z',
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-04-10T10:00:00.000Z',
    reviewedAt: null,
    reviewedByUserId: null,
    reviewSource: null,
    feedbackText: null,
    payloadKind: 'json',
    payloadSummary: {
      kind: 'public_debate_request',
      institutionEmail: 'contact@primarie.ro',
      organizationName: 'Asociatia Test',
      submissionPath: 'request_platform',
      isNgo: true,
    },
    institutionEmail: 'contact@primarie.ro',
    websiteUrl: null,
    organizationName: 'Asociatia Test',
    interactionElementLink:
      '/primarie/12345678/buget/provocari/civic-campaign/civic-monitor-and-request/04-debate-request',
    submissionPath: 'request_platform',
    isNgo: true,
    riskFlags: [],
    threadId: 'thread-1',
    threadPhase: 'awaiting_reply',
    lastEmailAt: '2026-04-10T10:05:00.000Z',
    lastReplyAt: null,
    nextActionAt: null,
    submittedEventCount: 1,
    evaluatedEventCount: 0,
    lastAuditAt: '2026-04-10T10:00:00.000Z',
    ...overrides,
  }
}

function createMetaResponse(
  overrides: Partial<CampaignAdminMetaResponse> = {}
): CampaignAdminMetaResponse {
  return {
    availableInteractionTypes: [
      {
        interactionId: 'funky:interaction:public_debate_request',
        label: 'Public debate request',
      },
      {
        interactionId: 'funky:interaction:city_hall_website',
        label: 'City hall website',
      },
    ],
    stats: {
      total: 12,
      riskFlagged: 3,
      withInstitutionThread: 9,
      reviewStatusCounts: {
        pending: 7,
        approved: 3,
        rejected: 1,
        notReviewed: 1,
      },
      phaseCounts: {
        idle: 1,
        draft: 2,
        pending: 5,
        resolved: 3,
        failed: 1,
      },
      threadPhaseCounts: {
        sending: 1,
        awaiting_reply: 2,
        reply_received_unreviewed: 1,
        manual_follow_up_needed: 1,
        resolved_positive: 2,
        resolved_negative: 1,
        closed_no_response: 1,
        failed: 1,
        none: 3,
      },
    },
    ...overrides,
  }
}

function mockQueueState(input: {
  items?: readonly CampaignAdminUserInteractionListItem[]
  error?: { status: number; message: string } | null
  isLoading?: boolean
  isFetching?: boolean
}) {
  useCampaignAdminQueueQueryMock.mockReturnValue({
    data: {
      items: input.items ?? [],
      page: {
        limit: 50,
        hasMore: false,
        nextCursor: null,
      },
    },
    error: input.error ?? null,
    isLoading: input.isLoading ?? false,
    isFetching: input.isFetching ?? false,
    refetch: vi.fn(),
  })
}

async function dispatchWindowPaste(text: string) {
  const pasteEvent = new window.Event('paste', {
    bubbles: true,
    cancelable: true,
  })

  Object.defineProperty(pasteEvent, 'clipboardData', {
    value: {
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  })

  await act(async () => {
    window.dispatchEvent(pasteEvent)
  })
}

function renderStatefulPage(initialSearch: CampaignAdminQueueSearch = defaultSearch) {
  function StatefulPage() {
    const [search, setSearch] = useState<CampaignAdminQueueSearch>(initialSearch)

    return (
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={search}
        onSearchChange={(nextSearch) => {
          setSearch(nextSearch)
        }}
      />
    )
  }

  return render(<StatefulPage />)
}

function getSheetFooterCloseButton(dialogName: string) {
  const dialog = screen.getByRole('dialog', { name: dialogName })
  return within(dialog).getAllByRole('button', { name: 'Close' })[1]!
}

function getAlertDialog(dialogName: string) {
  return screen.getByRole('alertdialog', { name: dialogName })
}

describe('CampaignAdminUserInteractionsPage', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
    useCampaignAdminInteractionMetaQueryMock.mockReset()
    useCampaignAdminQueueQueryMock.mockReset()
    useSubmitCampaignAdminReviewsMutationMock.mockReset()
    mutateAsyncMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    clipboardWriteTextMock.mockReset()
    clipboardWriteTextMock.mockResolvedValue(undefined)
    window.sessionStorage.clear()

    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    })

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true })
    useCampaignAdminInteractionMetaQueryMock.mockReturnValue({
      data: createMetaResponse(),
      error: null,
    })
    useSubmitCampaignAdminReviewsMutationMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    })
    mockQueueState({ items: [] })
  })

  it('renders sign-in gate when the user is signed out', () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    expect(screen.getByText('Sign in required')).toBeInTheDocument()
  })

  it('renders forbidden state when the server denies access', () => {
    mockQueueState({
      items: [],
      error: {
        status: 403,
        message: 'Forbidden',
      },
    })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    expect(screen.getByText('You do not have access to this queue')).toBeInTheDocument()
  })

  it('renders unavailable state when the server returns 404', () => {
    mockQueueState({
      items: [],
      error: {
        status: 404,
        message: 'Not found',
      },
    })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    expect(screen.getByText('Campaign queue unavailable')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This campaign admin queue is either not enabled on the current server or the campaign key is not supported by the current admin review surface.'
      )
    ).toBeInTheDocument()
  })

  it('renders empty state when no rows match', () => {
    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    expect(screen.getByText('No data available')).toBeInTheDocument()
    expect(screen.getByText('Clear filters')).toBeInTheDocument()
  })

  it('renders the shared queue header and review section shell', () => {
    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Interactions queue' })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open users' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Review queue' })
    ).toBeInTheDocument()
  })

  it('renders campaign-wide summary stats from meta data with safe fallbacks', () => {
    mockQueueState({
      items: [
        createItem(),
        createItem({
          userId: 'user-2',
          recordKey: 'funky:interaction:city_hall_website::entity:87654321',
          interactionId: 'funky:interaction:city_hall_website',
          entityCui: '87654321',
          entityName: 'Comuna Test',
          reviewStatus: 'approved',
          riskFlags: ['institution_email_mismatch'],
          threadPhase: null,
          threadId: null,
          institutionEmail: null,
          websiteUrl: 'https://primarie-2.test',
          interactionElementLink:
            '/primarie/87654321/buget/provocari/civic-campaign/civic-monitor-and-request/02-city-hall-website',
        }),
      ],
    })
    useCampaignAdminInteractionMetaQueryMock.mockReturnValue({
      data: createMetaResponse({
        stats: {
          total: 137,
          riskFlagged: 29,
          withInstitutionThread: 101,
          reviewStatusCounts: {
            pending: 41,
            approved: 72,
            rejected: 19,
            notReviewed: 5,
          },
          phaseCounts: {
            idle: 2,
            draft: 9,
            pending: 48,
            resolved: 70,
            failed: 8,
          },
          threadPhaseCounts: {
            sending: 4,
            awaiting_reply: 17,
            reply_received_unreviewed: 6,
            manual_follow_up_needed: 5,
            resolved_positive: 24,
            resolved_negative: 7,
            closed_no_response: 38,
            failed: 4,
            none: 36,
          },
        },
      }),
      error: null,
    })

    const firstRender = render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    const summary = screen.getByLabelText('Campaign queue summary')

    expect(screen.getByRole('group', { name: 'Pending: 41' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Warnings: 29' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Total: 137' })).toBeInTheDocument()
    expect(within(summary).getByText('Not reviewed').parentElement).toHaveTextContent(
      '5 Not reviewed'
    )

    fireEvent.click(screen.getByText('Show phase & thread breakdown'))

    expect(within(summary).getByText('With thread').parentElement).toHaveTextContent(
      '101 With thread'
    )
    expect(within(summary).getByText('No thread').parentElement).toHaveTextContent(
      '36 No thread'
    )

    firstRender.unmount()
    const metaRefetchMock = vi.fn()
    useCampaignAdminInteractionMetaQueryMock.mockReturnValue({
      data: undefined,
      error: {
        status: 500,
        message: 'Metadata failed',
      },
      refetch: metaRefetchMock,
    })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    expect(
      screen.getByText('Failed to load the queue summary')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Queue totals and warning counts are unavailable right now. The review table is still current.'
      )
    ).toBeInTheDocument()
  })

  it('requires feedback before single-item rejection is enabled', async () => {
    mockQueueState({ items: [createItem()] })

    renderStatefulPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0])

    await screen.findByText('Staged decision')
    fireEvent.click(screen.getByRole('radio', { name: /^Rejected/ }))

    const sendButton = screen.getByRole('button', { name: 'Save review' })
    expect(sendButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Review note'), {
      target: { value: 'Needs correction' },
    })

    expect(screen.getByRole('button', { name: 'Save review' })).toBeEnabled()
  })

  it('shows copy all rows by default when nothing is selected', () => {
    mockQueueState({ items: [createItem()] })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    const copyButton = screen.getAllByRole('button', { name: 'Copy all rows' })[0]
    expect(copyButton).toBeEnabled()

    fireEvent.click(screen.getAllByLabelText('Select row')[0])

    expect(
      screen.getAllByRole('button', { name: 'Copy selected rows' })[0]
    ).toBeEnabled()
  })

  it('copies selected rows from the toolbar clipboard action', async () => {
    mockQueueState({ items: [createItem()] })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Copy selected rows' })[0])
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Copy selected rows' }))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1)
    })

    const clipboardText = clipboardWriteTextMock.mock.calls[0]?.[0]
    expect(clipboardText).toContain('User Interaction ID\tUser ID\tRecord Key\tEntity Name')
    expect(clipboardText).toContain(
      'user-1::funky:interaction:public_debate_request::entity:12345678\tuser-1\tfunky:interaction:public_debate_request::entity:12345678'
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('Copied 1 review row to the clipboard.')
  })

  it('round-trips send notification through the table clipboard format and paste handler', async () => {
    mockQueueState({ items: [createItem()] })

    renderStatefulPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0])
    await screen.findByText('Staged decision')
    fireEvent.click(screen.getByRole('radio', { name: /^Approved/ }))
    fireEvent.click(getSheetFooterCloseButton('contact@primarie.ro'))

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    fireEvent.click(screen.getAllByLabelText('Send notification')[0])

    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Copy selected rows' })[0])
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Copy selected rows' }))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1)
    })

    const clipboardText = clipboardWriteTextMock.mock.calls[0]?.[0]
    expect(clipboardText).toContain('\tapproved\tyes\t')

    fireEvent.click(screen.getByRole('button', { name: 'Clear staged' }))
    fireEvent.click(
      within(getAlertDialog('Clear staged data for 1 row?')).getByRole('button', {
        name: 'Clear staged',
      })
    )
    await waitFor(() => {
      expect(screen.queryByText('1 row staged')).not.toBeInTheDocument()
    })

    await dispatchWindowPaste(String(clipboardText))

    expect(await screen.findByText('1 row staged')).toBeInTheDocument()
    expect(screen.getAllByText('Notify').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Submit selected' }))
    fireEvent.click(
      within(getAlertDialog('Submit 1 review?')).getByRole('button', {
        name: 'Submit selected',
      })
    )

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      items: [
        {
          userId: 'user-1',
          recordKey: 'funky:interaction:public_debate_request::entity:12345678',
          expectedUpdatedAt: '2026-04-10T10:00:00.000Z',
          status: 'approved',
        },
      ],
      send_notification: true,
    })
  })

  it('copies all visible rows when no row is selected', async () => {
    mockQueueState({
      items: [
        createItem(),
        createItem({
          userId: 'user-2',
          recordKey: 'funky:interaction:city_hall_website::entity:87654321',
          interactionId: 'funky:interaction:city_hall_website',
          entityCui: '87654321',
          entityName: 'Comuna Test',
          institutionEmail: null,
          websiteUrl: 'https://primarie-2.test',
          interactionElementLink:
            '/primarie/87654321/buget/provocari/civic-campaign/civic-monitor-and-request/02-city-hall-website',
          threadId: null,
          threadPhase: null,
        }),
      ],
    })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Copy all rows' })[0])
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Copy all rows' }))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1)
    })

    const clipboardText = clipboardWriteTextMock.mock.calls[0]?.[0]
    expect(clipboardText).toContain(
      'user-1::funky:interaction:public_debate_request::entity:12345678'
    )
    expect(clipboardText).toContain(
      'user-2::funky:interaction:city_hall_website::entity:87654321'
    )
    expect(toastSuccessMock).toHaveBeenCalledWith('Copied 2 review rows to the clipboard.')
  })

  it('renders primary queue data before interaction and review metadata columns', () => {
    mockQueueState({ items: [createItem()] })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent?.trim())

    expect(headers).toEqual([
      '',
      'Review status',
      'User ID',
      'Entity',
      'Updated',
      'Risk flags',
      'Message',
      'Interaction',
      'Value',
      'Review state',
      'Notify',
      'Actions',
    ])
  })

  it('sorts the value column locally without changing the queue search', () => {
    mockQueueState({
      items: [
        createItem({
          recordKey: 'record-zeta',
          institutionEmail: 'zeta@primarie.ro',
        }),
        createItem({
          userId: 'user-2',
          recordKey: 'record-alpha',
          institutionEmail: 'alpha@primarie.ro',
        }),
      ],
    })
    const onSearchChange = vi.fn()
    const { container } = render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={onSearchChange}
      />
    )

    const getDesktopRowOrder = () =>
      Array.from(container.querySelectorAll('tbody tr')).map((row) =>
        row.textContent?.includes('alpha@primarie.ro')
          ? 'alpha'
          : row.textContent?.includes('zeta@primarie.ro')
            ? 'zeta'
            : 'unknown'
      )

    expect(getDesktopRowOrder()).toEqual(['zeta', 'alpha'])

    fireEvent.click(screen.getByRole('button', { name: 'Value sort' }))

    expect(onSearchChange).not.toHaveBeenCalled()
    expect(getDesktopRowOrder()).toEqual(['alpha', 'zeta'])
  })

  it('selects a visible range when shift-clicking a row checkbox', () => {
    mockQueueState({
      items: [
        createItem({
          recordKey: 'record-1',
        }),
        createItem({
          userId: 'user-2',
          recordKey: 'record-2',
        }),
        createItem({
          userId: 'user-3',
          recordKey: 'record-3',
        }),
      ],
    })

    renderStatefulPage()

    const rowCheckboxes = screen.getAllByLabelText('Select row')

    fireEvent.click(rowCheckboxes[0]!)
    fireEvent.click(rowCheckboxes[2]!, { shiftKey: true })

    expect(screen.getByText('3 rows selected')).toBeInTheDocument()
  })

  it('supports keyboard range selection with Space and Shift+Space', () => {
    mockQueueState({
      items: [
        createItem({
          recordKey: 'record-1',
        }),
        createItem({
          userId: 'user-2',
          recordKey: 'record-2',
        }),
        createItem({
          userId: 'user-3',
          recordKey: 'record-3',
        }),
      ],
    })

    renderStatefulPage()

    const rowCheckboxes = screen.getAllByLabelText('Select row')

    rowCheckboxes[0]!.focus()
    fireEvent.keyDown(rowCheckboxes[0]!, { key: ' ', code: 'Space' })
    fireEvent.keyUp(rowCheckboxes[0]!, { key: ' ', code: 'Space' })

    rowCheckboxes[2]!.focus()
    fireEvent.keyDown(rowCheckboxes[2]!, {
      key: ' ',
      code: 'Space',
      shiftKey: true,
    })
    fireEvent.keyUp(rowCheckboxes[2]!, {
      key: ' ',
      code: 'Space',
      shiftKey: true,
    })

    expect(screen.getByText('3 rows selected')).toBeInTheDocument()
  })

  it('skips non-pending rows inside a shift-click selection range', () => {
    mockQueueState({
      items: [
        createItem({
          recordKey: 'record-1',
        }),
        createItem({
          userId: 'user-2',
          recordKey: 'record-2',
          reviewStatus: 'approved',
          reviewable: false,
        }),
        createItem({
          userId: 'user-3',
          recordKey: 'record-3',
        }),
      ],
    })

    renderStatefulPage()

    const rowCheckboxes = screen.getAllByLabelText('Select row')

    expect(rowCheckboxes[1]).toBeDisabled()

    fireEvent.click(rowCheckboxes[0]!)
    fireEvent.click(rowCheckboxes[2]!, { shiftKey: true })

    expect(screen.getByText('2 rows selected')).toBeInTheDocument()
  })

  it('requires explicit confirmation before risky approval', async () => {
    mockQueueState({
      items: [
        createItem({
          riskFlags: ['institution_email_mismatch'],
        }),
      ],
    })

    renderStatefulPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0])

    await screen.findByText('Staged decision')
    fireEvent.click(screen.getByRole('radio', { name: /^Approved/ }))

    const sendButton = screen.getByRole('button', { name: 'Save review' })
    expect(sendButton).toBeDisabled()

    fireEvent.click(screen.getByLabelText('Confirm approval warning'))

    expect(screen.getByRole('button', { name: 'Save review' })).toBeEnabled()
  })

  it('uses staged spreadsheet drafts when submitting bulk review', async () => {
    mockQueueState({
      items: [
        createItem(),
        createItem({
          userId: 'user-2',
          recordKey: 'funky:interaction:city_hall_website::entity:87654321',
          interactionId: 'funky:interaction:city_hall_website',
          entityCui: '87654321',
          entityName: 'Comuna Test',
          institutionEmail: null,
          websiteUrl: 'https://primarie-2.test',
          interactionElementLink:
            '/primarie/87654321/buget/provocari/civic-campaign/civic-monitor-and-request/02-city-hall-website',
          threadId: null,
          threadPhase: null,
        }),
      ],
    })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    fireEvent.click(screen.getAllByLabelText('Select row')[1])
    await dispatchWindowPaste(
      'User Interaction ID\tDecision\tReview Feedback\n'
      + 'user-1::funky:interaction:public_debate_request::entity:12345678\tapproved\tSpreadsheet approved\n'
      + 'user-2::funky:interaction:city_hall_website::entity:87654321\trejected\tNeeds website cleanup'
    )
    expect(await screen.findByText('2 rows staged')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Submit selected' }))
    fireEvent.click(within(getAlertDialog('Submit 2 reviews?')).getByRole('button', { name: 'Submit selected' }))

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      items: [
        {
          userId: 'user-1',
          recordKey: 'funky:interaction:public_debate_request::entity:12345678',
          expectedUpdatedAt: '2026-04-10T10:00:00.000Z',
          status: 'approved',
          feedbackText: 'Spreadsheet approved',
        },
        {
          userId: 'user-2',
          recordKey: 'funky:interaction:city_hall_website::entity:87654321',
          expectedUpdatedAt: '2026-04-10T10:00:00.000Z',
          status: 'rejected',
          feedbackText: 'Needs website cleanup',
        },
      ],
      send_notification: false,
    })
  })

  it('imports matched review rows from paste even without a selection', async () => {
    mockQueueState({
      items: [
        createItem(),
        createItem({
          userId: 'user-2',
          recordKey: 'funky:interaction:city_hall_website::entity:87654321',
          interactionId: 'funky:interaction:city_hall_website',
          entityCui: '87654321',
          entityName: 'Comuna Test',
          institutionEmail: null,
          websiteUrl: 'https://primarie-2.test',
          interactionElementLink:
            '/primarie/87654321/buget/provocari/civic-campaign/civic-monitor-and-request/02-city-hall-website',
          threadId: null,
          threadPhase: null,
        }),
      ],
    })

    renderStatefulPage()

    await dispatchWindowPaste(
      'User Interaction ID\tDecision\tReview Feedback\n'
      + 'user-2::funky:interaction:city_hall_website::entity:87654321\trejected\tNeeds website cleanup'
    )

    expect(await screen.findAllByText('Needs website cleanup')).not.toHaveLength(0)
    expect(toastSuccessMock).toHaveBeenCalledWith('Imported staged review values for 1 row.')
  })

  it('prefills staged spreadsheet feedback in the review sheet', async () => {
    mockQueueState({ items: [createItem()] })

    renderStatefulPage()

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    await dispatchWindowPaste(
      'User Interaction ID\tDecision\tReview Feedback\n'
      + 'user-1::funky:interaction:public_debate_request::entity:12345678\trejected\tNeeds spreadsheet correction'
    )
    await screen.findByText('1 row staged')
    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0])

    expect(await screen.findByDisplayValue('Needs spreadsheet correction')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^Rejected/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('shows validation issues when send selected is clicked with missing staged data', async () => {
    mockQueueState({ items: [createItem()] })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Submit selected' }))

    expect(await screen.findByText('Selected rows need fixes')).toBeInTheDocument()
    expect(screen.getByText('Missing staged review values. Paste spreadsheet rows with matching ids first.')).toBeInTheDocument()
  })

  it('allows approved staged rows to send without a review note', async () => {
    mockQueueState({ items: [createItem()] })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={vi.fn()}
      />
    )

    await dispatchWindowPaste(
      'User Interaction ID\tDecision\tReview Feedback\n'
      + 'user-1::funky:interaction:public_debate_request::entity:12345678\tapproved\t'
    )

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    await screen.findByText('1 row staged')
    fireEvent.click(screen.getByRole('button', { name: 'Submit selected' }))
    fireEvent.click(within(getAlertDialog('Submit 1 review?')).getByRole('button', { name: 'Submit selected' }))

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      items: [
        {
          userId: 'user-1',
          recordKey: 'funky:interaction:public_debate_request::entity:12345678',
          expectedUpdatedAt: '2026-04-10T10:00:00.000Z',
          status: 'approved',
        },
      ],
      send_notification: false,
    })
  })

  it('blocks risky imported approvals until explicitly acknowledged', async () => {
    mockQueueState({
      items: [
        createItem({
          riskFlags: ['missing_official_email'],
        }),
      ],
    })

    renderStatefulPage()

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    await dispatchWindowPaste(
      'User Interaction ID\tDecision\tReview Feedback\n'
      + 'user-1::funky:interaction:public_debate_request::entity:12345678\tapproved\t'
    )

    await screen.findByText('1 row staged')
    fireEvent.click(screen.getByRole('button', { name: 'Submit selected' }))

    expect(await screen.findByText(riskyApprovalValidationMessage)).toBeInTheDocument()
    expect(mutateAsyncMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /contact@primarie\.ro/i }))

    const reviewSheet = await screen.findByRole('dialog', { name: 'contact@primarie.ro' })
    fireEvent.click(within(reviewSheet).getByLabelText('Confirm approval warning'))
    fireEvent.click(getSheetFooterCloseButton('contact@primarie.ro'))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'contact@primarie.ro' })).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Submit selected' }))
    fireEvent.click(within(getAlertDialog('Submit 1 review?')).getByRole('button', { name: 'Submit selected' }))

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      items: [
        {
          userId: 'user-1',
          recordKey: 'funky:interaction:public_debate_request::entity:12345678',
          expectedUpdatedAt: '2026-04-10T10:00:00.000Z',
          status: 'approved',
          approvalRiskAcknowledged: true,
        },
      ],
      send_notification: false,
    })
  })

  it('persists pasted staged drafts across a reload in the same session', async () => {
    mockQueueState({ items: [createItem()] })

    const firstRender = renderStatefulPage()

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    await dispatchWindowPaste(
      'User Interaction ID\tDecision\tReview Feedback\n'
      + 'user-1::funky:interaction:public_debate_request::entity:12345678\trejected\tReload survives'
    )

    await screen.findByText('1 row staged')
    firstRender.unmount()

    renderStatefulPage()

    expect(await screen.findAllByText('Reload survives')).not.toHaveLength(0)
  })

  it('opens and closes the sidebar through route search changes', async () => {
    mockQueueState({ items: [createItem()] })
    const onSearchChange = vi.fn()
    const selectionKey = 'user-1::funky:interaction:public_debate_request::entity:12345678'
    const { rerender } = render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={defaultSearch}
        onSearchChange={onSearchChange}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0])

    expect(onSearchChange).toHaveBeenCalledWith({
      limit: 50,
      reviewStatus: 'pending',
      reviewSelectionKey: selectionKey,
    }, undefined)

    rerender(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={{
          limit: 50,
          reviewSelectionKey: selectionKey,
        }}
        onSearchChange={onSearchChange}
      />
    )

    expect(await screen.findByRole('dialog', { name: 'contact@primarie.ro' })).toBeInTheDocument()

    fireEvent.click(getSheetFooterCloseButton('contact@primarie.ro'))

    expect(onSearchChange).toHaveBeenLastCalledWith({
      limit: 50,
      reviewStatus: 'pending',
    }, undefined)
  })

  it('opens the correct row from the validation dialog', async () => {
    mockQueueState({
      items: [
        createItem(),
        createItem({
          userId: 'user-2',
          recordKey: 'funky:interaction:city_hall_website::entity:87654321',
          interactionId: 'funky:interaction:city_hall_website',
          entityCui: '87654321',
          entityName: 'Comuna Test',
          institutionEmail: null,
          websiteUrl: 'https://primarie-2.test',
          interactionElementLink:
            '/primarie/87654321/buget/provocari/civic-campaign/civic-monitor-and-request/02-city-hall-website',
          threadId: null,
          threadPhase: null,
        }),
      ],
    })

    renderStatefulPage()

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    fireEvent.click(screen.getAllByLabelText('Select row')[1])
    await dispatchWindowPaste(
      'User Interaction ID\tDecision\tReview Feedback\n'
      + 'user-1::funky:interaction:public_debate_request::entity:12345678\tapproved\tSpreadsheet approved'
    )
    await screen.findByText('1 row staged')

    fireEvent.click(screen.getByRole('button', { name: 'Submit selected' }))

    const issueButton = await screen.findByRole('button', { name: /https:\/\/primarie-2\.test/i })
    fireEvent.click(issueButton)

    await waitFor(() => {
      expect(screen.queryByText('Selected rows need fixes')).not.toBeInTheDocument()
    })
    expect(await screen.findByRole('dialog', { name: 'https://primarie-2.test' })).toBeInTheDocument()
    expect(screen.getByText('Staged decision')).toBeInTheDocument()
  })

  it('uses sidebar edits as the shared staged state for bulk send', async () => {
    mockQueueState({ items: [createItem()] })

    renderStatefulPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0])
    await screen.findByText('Staged decision')
    fireEvent.click(screen.getByRole('radio', { name: /^Rejected/ }))
    fireEvent.change(screen.getByLabelText('Review note'), {
      target: { value: 'Needs human follow-up' },
    })
    fireEvent.click(getSheetFooterCloseButton('contact@primarie.ro'))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'contact@primarie.ro' })).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('Needs human follow-up')).not.toHaveLength(0)

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Submit selected' }))
    fireEvent.click(within(getAlertDialog('Submit 1 review?')).getByRole('button', { name: 'Submit selected' }))

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      items: [
        {
          userId: 'user-1',
          recordKey: 'funky:interaction:public_debate_request::entity:12345678',
          expectedUpdatedAt: '2026-04-10T10:00:00.000Z',
          status: 'rejected',
          feedbackText: 'Needs human follow-up',
        },
      ],
      send_notification: false,
    })
  })

  it('blocks rejected sidebar drafts without a review note', async () => {
    mockQueueState({ items: [createItem()] })

    renderStatefulPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'Review' })[0])
    await screen.findByText('Staged decision')
    fireEvent.click(screen.getByRole('radio', { name: /^Rejected/ }))
    fireEvent.click(getSheetFooterCloseButton('contact@primarie.ro'))

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Submit selected' }))

    expect(await screen.findByText('Rejected rows need a review note before saving.')).toBeInTheDocument()
  })

  it('confirms before clearing staged data', async () => {
    mockQueueState({ items: [createItem()] })

    renderStatefulPage()

    fireEvent.click(screen.getAllByLabelText('Select row')[0])
    await dispatchWindowPaste(
      'User Interaction ID\tDecision\tReview Feedback\n'
      + 'user-1::funky:interaction:public_debate_request::entity:12345678\trejected\tNeeds spreadsheet correction'
    )

    await screen.findByText('1 row staged')
    fireEvent.click(screen.getByRole('button', { name: 'Clear staged' }))

    expect(getAlertDialog('Clear staged data for 1 row?')).toBeInTheDocument()
    fireEvent.click(within(getAlertDialog('Clear staged data for 1 row?')).getByRole('button', { name: 'Clear staged' }))

    await waitFor(() => {
      expect(screen.queryByText('1 row staged')).not.toBeInTheDocument()
    })
  })
})
