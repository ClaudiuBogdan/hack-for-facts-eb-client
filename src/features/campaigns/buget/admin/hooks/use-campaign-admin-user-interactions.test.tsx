import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CampaignAdminListResponse,
  CampaignAdminMetaResponse,
  CampaignAdminSubmitReviewsBody,
  CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'
import { createTestQueryClient } from '@/test/test-utils'
import {
  campaignAdminKeys,
  useSubmitCampaignAdminReviewsMutation,
} from './use-campaign-admin-user-interactions'

const submitCampaignAdminReviewsMock = vi.fn<
  (input: {
    campaignKey: 'funky'
    body: CampaignAdminSubmitReviewsBody
  }) => Promise<readonly CampaignAdminUserInteractionListItem[]>
>()

vi.mock('@/features/campaigns/buget/admin/api/campaign-admin-user-interactions', () => ({
  getCampaignAdminUserInteractionsMeta: vi.fn(),
  listCampaignAdminUserInteractions: vi.fn(),
  submitCampaignAdminReviews: (input: {
    campaignKey: 'funky'
    body: CampaignAdminSubmitReviewsBody
  }) => submitCampaignAdminReviewsMock(input),
}))

function createWrapper(queryClient: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createInteractionItem(
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
    pendingReason: 'institution_email_mismatch',
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
    riskFlags: ['institution_email_mismatch'],
    threadId: 'thread-1',
    threadPhase: 'failed',
    lastEmailAt: '2026-04-10T10:10:00.000Z',
    lastReplyAt: null,
    nextActionAt: null,
    submittedEventCount: 1,
    evaluatedEventCount: 0,
    lastAuditAt: '2026-04-10T10:00:00.000Z',
    ...overrides,
  }
}

function createListResponse(
  items: readonly CampaignAdminUserInteractionListItem[]
): CampaignAdminListResponse {
  return {
    items,
    page: {
      limit: 50,
      hasMore: false,
      nextCursor: null,
    },
  }
}

describe('useSubmitCampaignAdminReviewsMutation', () => {
  beforeEach(() => {
    submitCampaignAdminReviewsMock.mockReset()
  })

  it('patches all cached queue variants without touching meta caches', async () => {
    const queryClient = createTestQueryClient()
    const invalidateQueriesSpy = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue(undefined)
    const baseItem = createInteractionItem()
    const untouchedItem = createInteractionItem({
      userId: 'user-2',
      recordKey: 'funky:interaction:public_debate_request::entity:87654321',
      entityCui: '87654321',
      entityName: 'Comuna Test',
      interactionElementLink:
        '/primarie/87654321/buget/provocari/civic-campaign/civic-monitor-and-request/04-debate-request',
      institutionEmail: 'office@comuna.ro',
      payloadSummary: {
        kind: 'public_debate_request',
        institutionEmail: 'office@comuna.ro',
        organizationName: 'Asociatia Test',
        submissionPath: 'request_platform',
        isNgo: true,
      },
      riskFlags: [],
      threadId: null,
      threadPhase: null,
      lastEmailAt: null,
    })
    const updatedItem = createInteractionItem({
      reviewStatus: 'approved',
      feedbackText: 'Approved',
      reviewedAt: '2026-04-11T08:00:00.000Z',
      reviewedByUserId: 'admin-1',
      reviewSource: 'campaign_admin_api',
      updatedAt: '2026-04-11T08:00:00.000Z',
    })
    const metaResponse: CampaignAdminMetaResponse = {
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
    }
    const firstQueueKey = campaignAdminKeys.queue(
      'funky',
      { reviewStatus: 'pending' },
      null,
      50
    )
    const secondQueueKey = campaignAdminKeys.queue(
      'funky',
      { reviewStatus: 'approved', entityCui: '12345678' },
      'cursor-1',
      100
    )

    queryClient.setQueryData(firstQueueKey, createListResponse([baseItem, untouchedItem]))
    queryClient.setQueryData(secondQueueKey, createListResponse([baseItem]))
    queryClient.setQueryData(campaignAdminKeys.meta('funky'), metaResponse)

    submitCampaignAdminReviewsMock.mockResolvedValue([updatedItem])

    const { result } = renderHook(() => useSubmitCampaignAdminReviewsMutation('funky'), {
      wrapper: createWrapper(queryClient),
    })

    let mutationResult: readonly CampaignAdminUserInteractionListItem[] | undefined

    await act(async () => {
      mutationResult = await result.current.mutateAsync({
        items: [
          {
            userId: baseItem.userId,
            recordKey: baseItem.recordKey,
            expectedUpdatedAt: baseItem.updatedAt,
            status: 'approved',
          },
        ],
      })
    })

    expect(mutationResult).toEqual([updatedItem])
    expect(submitCampaignAdminReviewsMock).toHaveBeenCalledWith({
      campaignKey: 'funky',
      body: {
        items: [
          {
            userId: baseItem.userId,
            recordKey: baseItem.recordKey,
            expectedUpdatedAt: baseItem.updatedAt,
            status: 'approved',
          },
        ],
      },
    })
    expect(queryClient.getQueryData<CampaignAdminListResponse>(firstQueueKey)).toEqual(
      createListResponse([updatedItem, untouchedItem])
    )
    expect(queryClient.getQueryData<CampaignAdminListResponse>(secondQueueKey)).toEqual(
      createListResponse([updatedItem])
    )
    expect(
      queryClient.getQueryData<CampaignAdminMetaResponse>(campaignAdminKeys.meta('funky'))
    ).toEqual(metaResponse)
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: campaignAdminKeys.allForCampaign('funky'),
    })
  })
})
