import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  downloadCampaignAdminUserInteractionsCsv,
  getCampaignAdminUserInteractionsMeta,
  listAllCampaignAdminUserInteractions,
  listCampaignAdminUserInteractions,
  submitCampaignAdminReviews,
} from './campaign-admin-user-interactions'

const getAuthTokenMock = vi.fn<() => Promise<string | null>>()

vi.mock('@/config/env', async () => {
  return {
    env: {
      VITE_APP_ENVIRONMENT: 'test',
    },
    getApiBaseUrl: () => 'http://localhost:3000',
  }
})

vi.mock('@/lib/auth', () => ({
  getAuthToken: () => getAuthTokenMock(),
}))

function createListResponsePayload() {
  return {
    ok: true,
    data: {
      items: [
        {
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
          reviewable: true,
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
        },
      ],
      page: {
        limit: 50,
        totalCount: 1,
        hasMore: true,
        nextCursor: 'cursor-1',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
    },
  }
}

function createMetaResponsePayload() {
  return {
    ok: true,
    data: {
      availableInteractionTypes: [
        {
          interactionId: 'funky:interaction:public_debate_request',
          label: 'Public debate request',
          reviewable: true,
        },
        {
          interactionId: 'funky:interaction:city_hall_website',
          label: 'City hall website',
          reviewable: true,
        },
      ],
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
    },
  }
}

describe('campaign-admin-user-interactions api', () => {
  beforeEach(() => {
    getAuthTokenMock.mockReset()
    vi.restoreAllMocks()
  })

  it('lists queue items with auth and query parameters', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(createListResponsePayload()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await listCampaignAdminUserInteractions({
      campaignKey: 'funky',
      filters: {
        reviewStatus: 'pending',
        entityCui: '12345678',
        hasInstitutionThread: true,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
      cursor: 'cursor-0',
      limit: 50,
    })

    expect(result.items).toHaveLength(1)
    expect(result.page.totalCount).toBe(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/v1/admin/campaigns/funky/user-interactions?reviewStatus=pending&entityCui=12345678&hasInstitutionThread=true&sortBy=updatedAt&sortOrder=desc&cursor=cursor-0&limit=50'
      ),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      })
    )
  })

  it('downloads the queue csv with auth, export filters, and server sort', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('csv', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="queue.csv"',
        },
      })
    )

    const result = await downloadCampaignAdminUserInteractionsCsv({
      campaignKey: 'funky',
      filters: {
        reviewStatus: 'pending',
        submissionPath: 'request_platform',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      },
    })

    expect(result.filename).toBe('queue.csv')
    expect(await result.blob.text()).toBe('csv')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/admin/campaigns/funky/user-interactions/export?reviewStatus=pending&submissionPath=request_platform&sortBy=updatedAt&sortOrder=desc',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      })
    )
  })

  it('uses RFC 5987 filenames for queue csv downloads', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('csv', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition':
            "attachment; filename*=UTF-8''queue%20export.csv",
        },
      })
    )

    const result = await downloadCampaignAdminUserInteractionsCsv({
      campaignKey: 'funky',
      filters: {},
    })

    expect(result.filename).toBe('queue export.csv')
  })

  it('accepts unquoted filenames for queue csv downloads', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('csv', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=queue.csv',
        },
      })
    )

    const result = await downloadCampaignAdminUserInteractionsCsv({
      campaignKey: 'funky',
      filters: {},
    })

    expect(result.filename).toBe('queue.csv')
  })

  it('fails with 401 before fetching when auth is missing', async () => {
    getAuthTokenMock.mockResolvedValue(null)

    await expect(
      listCampaignAdminUserInteractions({
        campaignKey: 'funky',
        filters: {},
        cursor: null,
        limit: 50,
      })
    ).rejects.toMatchObject({
      status: 401,
      message: 'Sign in required for this campaign admin queue.',
    })
  })

  it('loads interaction metadata for the selector', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(createMetaResponsePayload()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const result = await getCampaignAdminUserInteractionsMeta({
      campaignKey: 'funky',
    })

    expect(result.availableInteractionTypes).toEqual([
      {
        interactionId: 'funky:interaction:public_debate_request',
        label: 'Public debate request',
        reviewable: true,
      },
      {
        interactionId: 'funky:interaction:city_hall_website',
        label: 'City hall website',
        reviewable: true,
      },
    ])
    expect(result.stats).toEqual(createMetaResponsePayload().data.stats)
  })

  it('accepts expanded audit rows with quiz summaries', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            items: [
              {
                userId: 'user-2',
                recordKey: 'ch-civic-01-how-module-works-q1::global',
                campaignKey: 'funky',
                interactionId: 'ch-civic-01-how-module-works-q1',
                lessonId: 'civic-monitor-and-request',
                entityCui: null,
                entityName: null,
                scopeType: 'global',
                phase: 'resolved',
                reviewStatus: null,
                reviewable: false,
                pendingReason: null,
                submittedAt: '2026-04-10T11:00:00.000Z',
                createdAt: '2026-04-10T11:00:00.000Z',
                updatedAt: '2026-04-10T11:00:00.000Z',
                reviewedAt: null,
                reviewedByUserId: null,
                reviewSource: null,
                feedbackText: null,
                payloadKind: 'choice',
                payloadSummary: {
                  kind: 'quiz',
                  selectedOptionId: 'option-a',
                  outcome: 'correct',
                  score: 1,
                },
                institutionEmail: null,
                websiteUrl: null,
                organizationName: null,
                interactionElementLink: null,
                submissionPath: null,
                isNgo: null,
                riskFlags: [],
                threadId: null,
                threadPhase: null,
                lastEmailAt: null,
                lastReplyAt: null,
                nextActionAt: null,
                submittedEventCount: 1,
                evaluatedEventCount: 1,
                lastAuditAt: '2026-04-10T11:00:00.000Z',
              },
            ],
            page: {
              limit: 50,
              totalCount: 1,
              hasMore: false,
              nextCursor: null,
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    await expect(
      listCampaignAdminUserInteractions({
        campaignKey: 'funky',
        filters: {},
        cursor: null,
        limit: 50,
      })
    ).resolves.toMatchObject({
      items: [
        {
          interactionId: 'ch-civic-01-how-module-works-q1',
          reviewable: false,
          payloadSummary: {
            kind: 'quiz',
            selectedOptionId: 'option-a',
            outcome: 'correct',
            score: 1,
          },
        },
      ],
    })
  })

  it('submits explicit approval risk acknowledgement when present on approved reviews', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            items: createListResponsePayload().data.items,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    await submitCampaignAdminReviews({
      campaignKey: 'funky',
      body: {
        items: [
          {
            userId: 'user-1',
            recordKey: 'record-1',
            expectedUpdatedAt: '2026-04-10T10:00:00.000Z',
            status: 'approved',
            approvalRiskAcknowledged: true,
          },
        ],
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/campaigns/funky/user-interactions/reviews'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          items: [
            {
              userId: 'user-1',
              recordKey: 'record-1',
              expectedUpdatedAt: '2026-04-10T10:00:00.000Z',
              status: 'approved',
              approvalRiskAcknowledged: true,
            },
          ],
        }),
      })
    )
  })

  it('maps 404 responses to an unavailable-queue error', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: 'NotFoundError',
          message: 'Campaign review queue not found',
          retryable: false,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    await expect(
      listCampaignAdminUserInteractions({
        campaignKey: 'funky',
        filters: {},
        cursor: null,
        limit: 50,
      })
    ).rejects.toMatchObject({
      status: 404,
      message: 'Campaign review queue not found',
      retryable: false,
    })
  })

  it('maps review conflicts into CampaignAdminApiError', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          error: 'ConflictError',
          message: 'Interaction changed before review.',
          retryable: false,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    await expect(
      submitCampaignAdminReviews({
        campaignKey: 'funky',
        body: {
          items: [
            {
              userId: 'user-1',
              recordKey: 'record-1',
              expectedUpdatedAt: '2026-04-10T10:00:00.000Z',
              status: 'rejected',
              feedbackText: 'Needs correction',
            },
          ],
        },
      })
    ).rejects.toMatchObject({
      status: 409,
      message: 'Interaction changed before review.',
      retryable: false,
    })
  })

  it('does not expose raw non-json error bodies to operators', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>stack trace</html>', {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      })
    )

    await expect(
      listCampaignAdminUserInteractions({
        campaignKey: 'funky',
        filters: {},
        cursor: null,
        limit: 50,
      })
    ).rejects.toMatchObject({
      status: 500,
      message: 'Campaign admin request failed.',
    })
  })

  it('fails safely when a success response is not valid json', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>not json</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    )

    await expect(
      listCampaignAdminUserInteractions({
        campaignKey: 'funky',
        filters: {},
        cursor: null,
        limit: 50,
      })
    ).rejects.toMatchObject({
      status: 502,
      message: 'Campaign admin server returned invalid JSON.',
      code: 'invalid_json_response',
    })
  })

  it('fails safely when a success response does not match the expected schema', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            items: [],
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    await expect(
      listCampaignAdminUserInteractions({
        campaignKey: 'funky',
        filters: {},
        cursor: null,
        limit: 50,
      })
    ).rejects.toMatchObject({
      status: 502,
      message: 'Campaign admin queue response was invalid.',
      code: 'invalid_response',
    })
  })

  it('fails loudly when the all-items query exceeds its safe pagination limit', async () => {
    getAuthTokenMock.mockResolvedValue('token-123')
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount += 1

      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            items: createListResponsePayload().data.items,
            page: {
              limit: 1,
              totalCount: 1,
              hasMore: true,
              nextCursor: `cursor-${callCount}`,
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    })

    await expect(
      listAllCampaignAdminUserInteractions({
        campaignKey: 'funky',
        filters: {
          userId: 'user-1',
        },
        limit: 1,
        maxPages: 2,
      })
    ).rejects.toMatchObject({
      status: 502,
      code: 'pagination_limit_exceeded',
      message: 'Campaign admin user page exceeded the safe pagination limit.',
    })

    expect(callCount).toBe(2)
  })
})
