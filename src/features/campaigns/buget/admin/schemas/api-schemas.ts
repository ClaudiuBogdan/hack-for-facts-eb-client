import { z } from 'zod'
import {
  campaignAdminPayloadKindValues,
  campaignAdminPendingReasonValues,
  campaignAdminPhaseValues,
  type CampaignAdminMetaResponse,
  campaignAdminReviewSourceValues,
  campaignAdminReviewStatusValues,
  campaignAdminRiskFlagValues,
  campaignAdminScopeTypeValues,
  campaignAdminSubmissionPathValues,
  campaignAdminThreadPhaseValues,
  campaignAdminUserInteractionsSortKeyValues,
  type CampaignAdminListResponse,
  type CampaignAdminSubmitReviewsBody,
  type CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'

const campaignAdminPayloadSummarySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('public_debate_request'),
    institutionEmail: z.string().min(1).nullable(),
    organizationName: z.string().nullable(),
    submissionPath: z.enum(campaignAdminSubmissionPathValues).nullable(),
    isNgo: z.boolean().nullable(),
  }).strict(),
  z.object({
    kind: z.literal('website_url'),
    websiteUrl: z.string().min(1).nullable(),
  }).strict(),
  z.object({
    kind: z.literal('budget_document'),
    documentUrl: z.string().min(1).nullable(),
    documentTypes: z.array(z.enum(['pdf', 'word', 'excel', 'webpage', 'graphics', 'other'])),
  }).strict(),
  z.object({
    kind: z.literal('budget_publication_date'),
    publicationDate: z.string().min(1).nullable(),
    sources: z.array(z.object({
      type: z.enum(['website', 'press', 'social_media', 'other']),
      url: z.string().min(1).nullable(),
    }).strict()),
  }).strict(),
  z.object({
    kind: z.literal('budget_status'),
    isPublished: z.enum(['yes', 'no', 'dont_know']).nullable(),
    budgetStage: z.enum(['draft', 'approved']).nullable(),
  }).strict(),
  z.object({
    kind: z.literal('city_hall_contact'),
    email: z.string().min(1).nullable(),
    phone: z.string().nullable(),
  }).strict(),
  z.object({
    kind: z.literal('participation_report'),
    debateTookPlace: z.enum(['yes', 'no', 'dont_know']).nullable(),
    approximateAttendees: z.number().nullable(),
    citizensAllowedToSpeak: z.enum(['yes', 'no', 'partially']).nullable(),
    citizenInputsRecorded: z.enum(['yes', 'no', 'dont_know']).nullable(),
    observations: z.string().nullable(),
  }).strict(),
  z.object({
    kind: z.literal('quiz'),
    selectedOptionId: z.string().min(1).nullable(),
    outcome: z.enum(['correct', 'incorrect']).nullable(),
    score: z.number().nullable(),
  }).strict(),
  z.object({
    kind: z.literal('contestation'),
    contestedItem: z.string().nullable(),
    reasoning: z.string().nullable(),
    impact: z.string().nullable(),
    proposedChange: z.string().nullable(),
    senderName: z.string().nullable(),
    submissionPath: z.enum(campaignAdminSubmissionPathValues).nullable(),
    institutionEmail: z.string().min(1).nullable(),
  }).strict(),
])

const campaignAdminInteractionListItemSchema = z
  .object({
    userId: z.string().min(1),
    recordKey: z.string().min(1),
    campaignKey: z.literal('funky'),
    interactionId: z.string().min(1),
    lessonId: z.string().min(1),
    entityCui: z.string().min(1).nullable(),
    entityName: z.string().nullable(),
    scopeType: z.enum(campaignAdminScopeTypeValues),
    phase: z.enum(campaignAdminPhaseValues),
    reviewStatus: z.enum(campaignAdminReviewStatusValues).nullable(),
    reviewable: z.boolean().optional(),
    pendingReason: z.enum(campaignAdminPendingReasonValues).nullable(),
    submittedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    reviewedAt: z.string().datetime().nullable(),
    reviewedByUserId: z.string().min(1).nullable(),
    reviewSource: z.enum(campaignAdminReviewSourceValues).nullable(),
    feedbackText: z.string().nullable(),
    payloadKind: z.enum(campaignAdminPayloadKindValues).nullable(),
    payloadSummary: campaignAdminPayloadSummarySchema.nullable(),
    institutionEmail: z.string().min(1).nullable(),
    websiteUrl: z.string().min(1).nullable(),
    organizationName: z.string().nullable(),
    interactionElementLink: z.string().min(1).nullable(),
    submissionPath: z.enum(campaignAdminSubmissionPathValues).nullable(),
    isNgo: z.boolean().nullable(),
    riskFlags: z.array(z.enum(campaignAdminRiskFlagValues)),
    threadId: z.string().min(1).nullable(),
    threadPhase: z.enum(campaignAdminThreadPhaseValues).nullable(),
    lastEmailAt: z.string().datetime().nullable(),
    lastReplyAt: z.string().datetime().nullable(),
    nextActionAt: z.string().datetime().nullable(),
    submittedEventCount: z.number().int().nonnegative(),
    evaluatedEventCount: z.number().int().nonnegative(),
    lastAuditAt: z.string().datetime().nullable(),
  })
  .strict()

const campaignAdminAvailableInteractionTypeSchema = z
  .object({
    interactionId: z.string().min(1),
    label: z.string().min(1).nullable(),
    reviewable: z.boolean().optional(),
  })
  .strict()

const campaignAdminCountSchema = z.number().int().nonnegative()

const campaignAdminMetaStatsSchema = z
  .object({
    total: campaignAdminCountSchema,
    riskFlagged: campaignAdminCountSchema,
    withInstitutionThread: campaignAdminCountSchema,
    reviewStatusCounts: z
      .object({
        pending: campaignAdminCountSchema,
        approved: campaignAdminCountSchema,
        rejected: campaignAdminCountSchema,
        notReviewed: campaignAdminCountSchema,
      })
      .strict(),
    phaseCounts: z
      .object({
        idle: campaignAdminCountSchema,
        draft: campaignAdminCountSchema,
        pending: campaignAdminCountSchema,
        resolved: campaignAdminCountSchema,
        failed: campaignAdminCountSchema,
      })
      .strict(),
    threadPhaseCounts: z
      .object({
        sending: campaignAdminCountSchema,
        awaiting_reply: campaignAdminCountSchema,
        reply_received_unreviewed: campaignAdminCountSchema,
        manual_follow_up_needed: campaignAdminCountSchema,
        resolved_positive: campaignAdminCountSchema,
        resolved_negative: campaignAdminCountSchema,
        closed_no_response: campaignAdminCountSchema,
        failed: campaignAdminCountSchema,
        none: campaignAdminCountSchema,
      })
      .strict(),
  })
  .strict()

const campaignAdminListResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminInteractionListItemSchema),
        page: z
          .object({
            limit: z.number().int().min(1).max(100),
            hasMore: z.boolean(),
            nextCursor: z.string().min(1).nullable(),
            sortBy: z.enum(campaignAdminUserInteractionsSortKeyValues).optional(),
            sortOrder: z.enum(['asc', 'desc']).optional(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()

const campaignAdminSubmitReviewsResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminInteractionListItemSchema),
      })
      .strict(),
  })
  .strict()

const campaignAdminMetaResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        availableInteractionTypes: z.array(campaignAdminAvailableInteractionTypeSchema),
        stats: campaignAdminMetaStatsSchema,
      })
      .strict(),
  })
  .strict()

const campaignAdminErrorEnvelopeSchema = z
  .object({
    ok: z.boolean().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    code: z.string().optional(),
    retryable: z.boolean().optional(),
    details: z.unknown().optional(),
  })
  .strict()

const campaignAdminApproveReviewSchema = z
  .object({
    userId: z.string().min(1),
    recordKey: z.string().min(1),
    expectedUpdatedAt: z.string().datetime(),
    status: z.literal('approved'),
    feedbackText: z.string().min(1).optional(),
    approvalRiskAcknowledged: z.boolean().optional(),
  })
  .strict()

const campaignAdminRejectReviewSchema = z
  .object({
    userId: z.string().min(1),
    recordKey: z.string().min(1),
    expectedUpdatedAt: z.string().datetime(),
    status: z.literal('rejected'),
    feedbackText: z.string().min(1),
  })
  .strict()

export const campaignAdminSubmitReviewsBodySchema = z
  .object({
    items: z
      .array(z.union([campaignAdminApproveReviewSchema, campaignAdminRejectReviewSchema]))
      .min(1)
      .max(100),
  })
  .strict()

export function parseCampaignAdminListResponse(payload: unknown): CampaignAdminListResponse {
  const parsedPayload = campaignAdminListResponseSchema.safeParse(payload)
  if (!parsedPayload.success) {
    throw new Error('Invalid campaign admin queue response.')
  }

  return parsedPayload.data.data
}

export function parseCampaignAdminSubmitReviewsResponse(
  payload: unknown
): readonly CampaignAdminUserInteractionListItem[] {
  const parsedPayload = campaignAdminSubmitReviewsResponseSchema.safeParse(payload)
  if (!parsedPayload.success) {
    throw new Error('Invalid campaign admin review response.')
  }

  return parsedPayload.data.data.items
}

export function parseCampaignAdminMetaResponse(
  payload: unknown
): CampaignAdminMetaResponse {
  const parsedPayload = campaignAdminMetaResponseSchema.safeParse(payload)
  if (!parsedPayload.success) {
    throw new Error('Invalid campaign admin metadata response.')
  }

  return parsedPayload.data.data
}

export function parseCampaignAdminErrorEnvelope(payload: unknown) {
  const parsedPayload = campaignAdminErrorEnvelopeSchema.safeParse(payload)
  if (!parsedPayload.success) {
    return null
  }

  return parsedPayload.data
}

export function parseCampaignAdminSubmitReviewsBody(
  payload: unknown
): CampaignAdminSubmitReviewsBody {
  return campaignAdminSubmitReviewsBodySchema.parse(payload)
}
