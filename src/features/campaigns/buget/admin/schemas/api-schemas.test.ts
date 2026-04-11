import { describe, expect, it } from 'vitest'
import {
  parseCampaignAdminListResponse,
  parseCampaignAdminMetaResponse,
} from './api-schemas'

function createMetaResponsePayload() {
  return {
    ok: true,
    data: {
      availableInteractionTypes: [
        {
          interactionId: 'funky:interaction:public_debate_request',
          label: 'Public debate request',
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
        hasMore: false,
        nextCursor: null,
      },
    },
  }
}

describe('campaign admin api schemas', () => {
  it('parses the queue metadata stats contract', () => {
    expect(parseCampaignAdminMetaResponse(createMetaResponsePayload())).toEqual(
      createMetaResponsePayload().data
    )
  })

  it('parses queue items that include pendingReason', () => {
    expect(parseCampaignAdminListResponse(createListResponsePayload())).toEqual(
      createListResponsePayload().data
    )
  })

  it('rejects metadata payloads that omit zero-filled count keys', () => {
    const payload = createMetaResponsePayload()
    const invalidPayload = {
      ...payload,
      data: {
        ...payload.data,
        stats: {
          ...payload.data.stats,
          reviewStatusCounts: {
            pending: 41,
            approved: 72,
            rejected: 19,
          },
        },
      },
    }

    expect(() => parseCampaignAdminMetaResponse(invalidPayload)).toThrowError(
      'Invalid campaign admin metadata response.'
    )
  })
})
