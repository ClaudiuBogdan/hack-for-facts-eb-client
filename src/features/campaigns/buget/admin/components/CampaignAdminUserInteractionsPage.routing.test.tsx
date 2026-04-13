import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type ReactNode, useEffect, useState } from 'react'
import { CampaignAdminUserInteractionsPage } from './CampaignAdminUserInteractionsPage'
import type {
  CampaignAdminMetaResponse,
  CampaignAdminQueueSearch,
  CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'

const useAuthMock = vi.fn()
const useCampaignAdminInteractionMetaQueryMock = vi.fn()
const useCampaignAdminQueueQueryMock = vi.fn()
const useSubmitCampaignAdminReviewsMutationMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => useAuthMock(),
  AuthSignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/ResponsivePopover', () => ({
  ResponsivePopover: ({
    trigger,
    content,
  }: {
    trigger: ReactNode
    content: ReactNode
  }) => (
    <div>
      {trigger}
      <div>{content}</div>
    </div>
  ),
}))

vi.mock('@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions', () => ({
  useCampaignAdminInteractionMetaQuery: (...args: unknown[]) =>
    useCampaignAdminInteractionMetaQueryMock(...args),
  useCampaignAdminQueueQuery: (...args: unknown[]) =>
    useCampaignAdminQueueQueryMock(...args),
  useSubmitCampaignAdminReviewsMutation: (...args: unknown[]) =>
    useSubmitCampaignAdminReviewsMutationMock(...args),
}))

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

describe('CampaignAdminUserInteractionsPage routing', () => {
  beforeEach(() => {
    useAuthMock.mockReset()
    useCampaignAdminInteractionMetaQueryMock.mockReset()
    useCampaignAdminQueueQueryMock.mockReset()
    useSubmitCampaignAdminReviewsMutationMock.mockReset()

    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true })
    useCampaignAdminInteractionMetaQueryMock.mockReturnValue({
      data: createMetaResponse(),
      error: null,
      isPending: false,
      refetch: vi.fn(),
    })
    useSubmitCampaignAdminReviewsMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })
  })

  it('drops the stale local cursor immediately when route search changes externally', async () => {
    const queueQueryCalls: Array<{
      readonly filters: Record<string, unknown>
      readonly cursor: string | null
      readonly limit: number
    }> = []

    useCampaignAdminQueueQueryMock.mockImplementation((args) => {
      queueQueryCalls.push({
        filters: args.filters as Record<string, unknown>,
        cursor: args.cursor as string | null,
        limit: args.limit as number,
      })

      return {
        data: {
          items: [createItem()],
          page: {
            limit: 50,
            hasMore: true,
            nextCursor: 'cursor-1',
          },
        },
        error: null,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
      }
    })

    function StatefulPage({
      initialSearch,
    }: {
      readonly initialSearch: CampaignAdminQueueSearch
    }) {
      const [search, setSearch] = useState(initialSearch)

      useEffect(() => {
        setSearch(initialSearch)
      }, [initialSearch])

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

    const { rerender } = render(<StatefulPage initialSearch={{ limit: 50 }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(queueQueryCalls[queueQueryCalls.length - 1]).toMatchObject({
        cursor: 'cursor-1',
        filters: {},
      })
    })

    const callCountBeforeExternalChange = queueQueryCalls.length

    rerender(
      <StatefulPage initialSearch={{ limit: 50, entityCui: '87654321' }} />
    )

    await waitFor(() => {
      expect(queueQueryCalls[queueQueryCalls.length - 1]).toMatchObject({
        cursor: null,
        filters: {
          entityCui: '87654321',
        },
      })
    })

    const externalChangeCalls = queueQueryCalls.slice(callCountBeforeExternalChange)
    expect(externalChangeCalls).not.toContainEqual(
      expect.objectContaining({
        cursor: 'cursor-1',
        filters: expect.objectContaining({
          entityCui: '87654321',
        }),
      })
    )
  })

  it('restores a review-selection url for a row that lives on a later cursor page', async () => {
    useCampaignAdminQueueQueryMock.mockImplementation((args) => ({
      data: {
        items:
          args.cursor === 'cursor-1'
            ? [
                createItem({
                  userId: 'user-2',
                  recordKey:
                    'funky:interaction:city_hall_website::entity:87654321',
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
              ]
            : [createItem()],
        page: {
          limit: 50,
          hasMore: false,
          nextCursor: null,
        },
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    }))

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={{
          limit: 50,
          cursor: 'cursor-1',
          pageIndex: 2,
          reviewSelectionKey:
            'user-2::funky:interaction:city_hall_website::entity:87654321',
        }}
        onSearchChange={vi.fn()}
      />
    )

    expect(
      await screen.findByRole('dialog', { name: 'https://primarie-2.test' })
    ).toBeInTheDocument()
    expect(screen.getByText('Staged decision')).toBeInTheDocument()
  })

  it('clears stale local sorting when route search switches to a server sort', async () => {
    useCampaignAdminQueueQueryMock.mockReturnValue({
      data: {
        items: [
          createItem({
            recordKey: 'record-zeta',
            institutionEmail: 'zeta@primarie.ro',
            updatedAt: '2026-04-11T10:00:00.000Z',
          }),
          createItem({
            userId: 'user-2',
            recordKey: 'record-alpha',
            institutionEmail: 'alpha@primarie.ro',
            updatedAt: '2026-04-10T10:00:00.000Z',
          }),
        ],
        page: {
          limit: 50,
          hasMore: false,
          nextCursor: null,
        },
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    const { container, rerender } = render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={vi.fn()}
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

    fireEvent.click(screen.getByRole('button', { name: 'Value sort' }))
    expect(getDesktopRowOrder()).toEqual(['alpha', 'zeta'])

    rerender(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={{
          limit: 50,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        }}
        onSearchChange={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(getDesktopRowOrder()).toEqual(['zeta', 'alpha'])
    })
  })

  it('shows a summary error instead of rendering zero stats when metadata fails', () => {
    const refetch = vi.fn()

    useCampaignAdminInteractionMetaQueryMock.mockReturnValue({
      data: undefined,
      error: {
        status: 500,
        message: 'Metadata failed',
      },
      isPending: false,
      refetch,
    })
    useCampaignAdminQueueQueryMock.mockReturnValue({
      data: {
        items: [createItem()],
        page: {
          limit: 50,
          hasMore: false,
          nextCursor: null,
        },
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <CampaignAdminUserInteractionsPage
        campaignKey="funky"
        search={{ limit: 50 }}
        onSearchChange={vi.fn()}
      />
    )

    expect(
      screen.getByText('Failed to load the queue summary')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Campaign queue summary' })
    ).not.toBeInTheDocument()
  })
})
