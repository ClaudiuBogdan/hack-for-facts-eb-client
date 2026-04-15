import { describe, expect, it } from 'vitest'
import type {
  CampaignAdminStagedReviewDraft,
  CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'
import {
  CAMPAIGN_ADMIN_BULK_REVIEW_CLIPBOARD_HEADERS,
  parseCampaignAdminBulkReviewClipboardText,
  serializeCampaignAdminBulkReviewRowsToClipboardTsv,
} from './bulk-review-clipboard'

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

function createDraft(
  overrides: Partial<CampaignAdminStagedReviewDraft> = {}
): CampaignAdminStagedReviewDraft {
  return {
    userId: 'user-1',
    recordKey: 'funky:interaction:public_debate_request::entity:12345678',
    status: 'approved',
    feedbackText: 'Looks good',
    ...overrides,
  }
}

describe('campaign-admin bulk review clipboard', () => {
  it('serializes spreadsheet rows with the expected review headers and values', () => {
    const item = createItem()
    const tsv = serializeCampaignAdminBulkReviewRowsToClipboardTsv({
      items: [item],
      stagedDraftsByKey: {
        'user-1::funky:interaction:public_debate_request::entity:12345678': createDraft(),
      },
      baseUrl: 'https://example.test',
    })

    expect(tsv).toBe(
      `${CAMPAIGN_ADMIN_BULK_REVIEW_CLIPBOARD_HEADERS.join('\t')}\n`
      + 'user-1::funky:interaction:public_debate_request::entity:12345678\tuser-1\tfunky:interaction:public_debate_request::entity:12345678\tOras Test\t12345678\tPublic debate request\tfunky:interaction:public_debate_request\thttps://example.test/primarie/12345678\t'
      + 'https://example.test/primarie/12345678/buget/provocari/civic-campaign/civic-monitor-and-request/04-debate-request\tcontact@primarie.ro\tapproved\tno\tLooks good\n'
    )
  })

  it('neutralizes spreadsheet formulas in exported cells', () => {
    const item = createItem({
      institutionEmail: '=HYPERLINK(\"https://bad.test\")',
      entityName: '+Oras Test',
    })

    const tsv = serializeCampaignAdminBulkReviewRowsToClipboardTsv({
      items: [item],
      stagedDraftsByKey: {
        'user-1::funky:interaction:public_debate_request::entity:12345678': createDraft({
          feedbackText: '@Needs manual review',
        }),
      },
    })

    expect(tsv).toContain("\t'+Oras Test\t")
    expect(tsv).toContain("\t'=HYPERLINK(\"https://bad.test\")\t")
    expect(tsv).toContain("\t'@Needs manual review\n")
  })

  it('parses round-trip decision and feedback values from exported rows', () => {
    const items = [createItem()]
    const rawText = serializeCampaignAdminBulkReviewRowsToClipboardTsv({
      items,
      stagedDraftsByKey: {
        'user-1::funky:interaction:public_debate_request::entity:12345678': createDraft({
          status: 'rejected',
          feedbackText: 'Needs manual check',
        }),
      },
    })

    const parsed = parseCampaignAdminBulkReviewClipboardText({
      rawText,
      items,
    })

    expect(parsed.issues).toEqual([])
    expect(parsed.importedCount).toBe(1)
    expect(parsed.drafts).toEqual([
      {
        userId: 'user-1',
        recordKey: 'funky:interaction:public_debate_request::entity:12345678',
        status: 'rejected',
        feedbackText: 'Needs manual check',
        sendNotification: false,
      },
    ])
  })

  it('round-trips send notification values from exported rows', () => {
    const items = [createItem()]
    const rawText = serializeCampaignAdminBulkReviewRowsToClipboardTsv({
      items,
      stagedDraftsByKey: {
        'user-1::funky:interaction:public_debate_request::entity:12345678': createDraft({
          status: 'approved',
          feedbackText: 'Ready to notify',
          sendNotification: true,
        }),
      },
    })

    const parsed = parseCampaignAdminBulkReviewClipboardText({
      rawText,
      items,
    })

    expect(parsed.issues).toEqual([])
    expect(parsed.importedCount).toBe(1)
    expect(parsed.drafts).toEqual([
      {
        userId: 'user-1',
        recordKey: 'funky:interaction:public_debate_request::entity:12345678',
        status: 'approved',
        feedbackText: 'Ready to notify',
        sendNotification: true,
      },
    ])
  })

  it('accepts common header aliases for decision and feedback columns', () => {
    const items = [createItem()]
    const parsed = parseCampaignAdminBulkReviewClipboardText({
      rawText:
        'user_id,record_key,status,review note\n'
        + 'user-1,funky:interaction:public_debate_request::entity:12345678,aprobat,Spreadsheet verified',
      items,
    })

    expect(parsed.issues).toEqual([])
    expect(parsed.drafts).toEqual([
      {
        userId: 'user-1',
        recordKey: 'funky:interaction:public_debate_request::entity:12345678',
        status: 'approved',
        feedbackText: 'Spreadsheet verified',
      },
    ])
  })

  it('matches pasted rows by the composite user interaction id', () => {
    const items = [createItem()]
    const parsed = parseCampaignAdminBulkReviewClipboardText({
      rawText:
        'User Interaction ID\tDecision\tReview Feedback\n'
        + 'user-1::funky:interaction:public_debate_request::entity:12345678\tapproved\tSpreadsheet verified',
      items,
    })

    expect(parsed.issues).toEqual([])
    expect(parsed.drafts).toEqual([
      {
        userId: 'user-1',
        recordKey: 'funky:interaction:public_debate_request::entity:12345678',
        status: 'approved',
        feedbackText: 'Spreadsheet verified',
      },
    ])
  })

  it('accepts legacy user id plus record key rows when the composite id column is missing', () => {
    const items = [createItem()]
    const parsed = parseCampaignAdminBulkReviewClipboardText({
      rawText:
        'User ID\tRecord Key\tDecision\tReview Feedback\n'
        + 'user-1\tfunky:interaction:public_debate_request::entity:12345678\tapproved\tLooks good',
      items,
    })

    expect(parsed.issues).toEqual([])
    expect(parsed.drafts).toEqual([
      {
        userId: 'user-1',
        recordKey: 'funky:interaction:public_debate_request::entity:12345678',
        status: 'approved',
        feedbackText: 'Looks good',
      },
    ])
  })

  it('reports invalid decision values', () => {
    const parsed = parseCampaignAdminBulkReviewClipboardText({
      rawText:
        'User ID\tRecord Key\tDecision\tReview Feedback\n'
        + 'user-1\tfunky:interaction:public_debate_request::entity:12345678\tmaybe\tNeeds review',
      items: [createItem()],
    })

    expect(parsed.importedCount).toBe(0)
    expect(parsed.issues).toEqual([
      {
        rowNumber: 2,
        message: 'Invalid decision value: maybe',
      },
    ])
  })

  it('reports duplicate and unknown pasted review rows', () => {
    const items = [createItem()]
    const parsed = parseCampaignAdminBulkReviewClipboardText({
      rawText:
        'User Interaction ID\tDecision\tReview Feedback\n'
        + 'user-1::funky:interaction:public_debate_request::entity:12345678\tapproved\tLooks good\n'
        + 'user-1::funky:interaction:public_debate_request::entity:12345678\trejected\tSecond pass\n'
        + 'unknown-selection\tapproved\tMissing row',
      items,
    })

    expect(parsed.importedCount).toBe(1)
    expect(parsed.drafts).toEqual([
      {
        userId: 'user-1',
        recordKey: 'funky:interaction:public_debate_request::entity:12345678',
        status: 'approved',
        feedbackText: 'Looks good',
      },
    ])
    expect(parsed.issues).toEqual([
      {
        rowNumber: 3,
        message: 'Duplicate review row: funky:interaction:public_debate_request::entity:12345678',
      },
      {
        rowNumber: 4,
        message: 'Unknown selected review row: unknown-selection',
      },
    ])
  })

  it('does not import legacy rows when the interactive element id is ambiguous in the selection', () => {
    const items = [
      createItem(),
      createItem({
        userId: 'user-2',
      }),
    ]

    const parsed = parseCampaignAdminBulkReviewClipboardText({
      rawText:
        'Record Key\tDecision\tReview Feedback\n'
        + 'funky:interaction:public_debate_request::entity:12345678\tapproved\tLooks good',
      items,
    })

    expect(parsed.importedCount).toBe(0)
    expect(parsed.drafts).toEqual([])
    expect(parsed.issues).toEqual([
      {
        rowNumber: 2,
        message:
          'Ambiguous selected interactive element id: funky:interaction:public_debate_request::entity:12345678',
      },
    ])
  })
})
