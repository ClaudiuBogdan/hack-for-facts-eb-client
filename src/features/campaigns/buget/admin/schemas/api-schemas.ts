import { z } from "zod";
import {
  campaignAdminEntitiesSortKeyValues,
  campaignAdminNotificationEventTypeValues,
  campaignAdminNotificationSafeErrorCategoryValues,
  campaignAdminNotificationSourceValues,
  campaignAdminNotificationStatusValues,
  campaignAdminNotificationTriggerExecutionStatusValues,
  campaignAdminPayloadKindValues,
  campaignAdminPendingReasonValues,
  campaignAdminPhaseValues,
  type CampaignAdminNotificationTemplateDescriptor,
  type CampaignAdminNotificationTemplatePreview,
  type CampaignAdminNotificationTriggerDescriptor,
  type CampaignAdminNotificationTriggerExecutionBody,
  type CampaignAdminNotificationTriggerExecutionResponse,
  type CampaignAdminEntitiesListResponse,
  type CampaignAdminEntitiesMetaResponse,
  type CampaignAdminNotificationsListResponse,
  type CampaignAdminMetaResponse,
  campaignAdminReviewSourceValues,
  campaignAdminReviewStatusValues,
  campaignAdminRiskFlagValues,
  campaignAdminScopeTypeValues,
  campaignAdminSubmissionPathValues,
  campaignAdminThreadPhaseValues,
  campaignAdminUsersSortKeyValues,
  campaignAdminUserInteractionsSortKeyValues,
  type CampaignAdminListResponse,
  type CampaignAdminSubmitReviewsBody,
  type CampaignAdminUsersListResponse,
  type CampaignAdminUserInteractionListItem,
} from "@/features/campaigns/buget/admin/types";

const campaignAdminPayloadSummarySchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("public_debate_request"),
      institutionEmail: z.string().min(1).nullable(),
      organizationName: z.string().nullable(),
      submissionPath: z.enum(campaignAdminSubmissionPathValues).nullable(),
      isNgo: z.boolean().nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("website_url"),
      websiteUrl: z.string().min(1).nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("budget_document"),
      documentUrl: z.string().min(1).nullable(),
      documentTypes: z.array(
        z.enum(["pdf", "word", "excel", "webpage", "graphics", "other"]),
      ),
    })
    .strict(),
  z
    .object({
      kind: z.literal("budget_publication_date"),
      publicationDate: z.string().min(1).nullable(),
      sources: z.array(
        z
          .object({
            type: z.enum(["website", "press", "social_media", "other"]),
            url: z.string().min(1).nullable(),
          })
          .strict(),
      ),
    })
    .strict(),
  z
    .object({
      kind: z.literal("budget_status"),
      isPublished: z.enum(["yes", "no", "dont_know"]).nullable(),
      budgetStage: z.enum(["draft", "approved"]).nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("city_hall_contact"),
      email: z.string().min(1).nullable(),
      phone: z.string().nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("participation_report"),
      debateTookPlace: z.enum(["yes", "no", "dont_know"]).nullable(),
      approximateAttendees: z.number().nullable(),
      citizensAllowedToSpeak: z.enum(["yes", "no", "partially"]).nullable(),
      citizenInputsRecorded: z.enum(["yes", "no", "dont_know"]).nullable(),
      observations: z.string().nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("quiz"),
      selectedOptionId: z.string().min(1).nullable(),
      outcome: z.enum(["correct", "incorrect"]).nullable(),
      score: z.number().nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("contestation"),
      contestedItem: z.string().nullable(),
      reasoning: z.string().nullable(),
      impact: z.string().nullable(),
      proposedChange: z.string().nullable(),
      senderName: z.string().nullable(),
      submissionPath: z.enum(campaignAdminSubmissionPathValues).nullable(),
      institutionEmail: z.string().min(1).nullable(),
    })
    .strict(),
]);

const campaignAdminInteractionListItemSchema = z
  .object({
    userId: z.string().min(1),
    recordKey: z.string().min(1),
    campaignKey: z.literal("funky"),
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
  .strict();

const campaignAdminAvailableInteractionTypeSchema = z
  .object({
    interactionId: z.string().min(1),
    label: z.string().min(1).nullable(),
    reviewable: z.boolean().optional(),
  })
  .strict();

const campaignAdminCountSchema = z.number().int().nonnegative();

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
  .strict();

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
            sortBy: z
              .enum(campaignAdminUserInteractionsSortKeyValues)
              .optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const campaignAdminUserListItemSchema = z
  .object({
    userId: z.string().min(1),
    interactionCount: z.number().int().nonnegative(),
    pendingReviewCount: z.number().int().nonnegative(),
    latestUpdatedAt: z.string().datetime(),
    latestInteractionId: z.string().min(1).nullable(),
    latestEntityCui: z.string().min(1).nullable(),
    latestEntityName: z.string().nullable(),
  })
  .strict();

const campaignAdminUsersListResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminUserListItemSchema),
        page: z
          .object({
            hasMore: z.boolean(),
            nextCursor: z.string().min(1).nullable(),
            sortBy: z.enum(campaignAdminUsersSortKeyValues).optional(),
            sortOrder: z.enum(["asc", "desc"]).optional(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const campaignAdminEntityListItemSchema = z
  .object({
    entityCui: z.string().min(1),
    entityName: z.string().min(1).nullable(),
    userCount: z.number().int().nonnegative(),
    interactionCount: z.number().int().nonnegative(),
    pendingReviewCount: z.number().int().nonnegative(),
    notificationSubscriberCount: z.number().int().nonnegative(),
    notificationOutboxCount: z.number().int().nonnegative(),
    failedNotificationCount: z.number().int().nonnegative(),
    latestInteractionAt: z.string().datetime().nullable(),
    latestInteractionId: z.string().min(1).nullable(),
    latestNotificationAt: z.string().datetime().nullable(),
    latestNotificationType: z.string().min(1).nullable(),
    latestNotificationStatus: z
      .enum(campaignAdminNotificationStatusValues)
      .nullable(),
    hasPendingReviews: z.boolean(),
    hasSubscribers: z.boolean(),
    hasNotificationActivity: z.boolean(),
    hasFailedNotifications: z.boolean(),
  })
  .strict();

const campaignAdminEntitiesListResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminEntityListItemSchema),
        page: z
          .object({
            hasMore: z.boolean(),
            nextCursor: z.string().min(1).nullable(),
            sortBy: z.enum(campaignAdminEntitiesSortKeyValues),
            sortOrder: z.enum(["asc", "desc"]),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const campaignAdminEntitiesMetaResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        totalEntities: campaignAdminCountSchema,
        entitiesWithPendingReviews: campaignAdminCountSchema,
        entitiesWithSubscribers: campaignAdminCountSchema,
        entitiesWithNotificationActivity: campaignAdminCountSchema,
        entitiesWithFailedNotifications: campaignAdminCountSchema,
        availableInteractionTypes: z.array(
          campaignAdminAvailableInteractionTypeSchema,
        ),
      })
      .strict(),
  })
  .strict();

const campaignAdminNotificationSafeErrorSchema = z
  .object({
    category: z
      .enum(campaignAdminNotificationSafeErrorCategoryValues)
      .nullable(),
    code: z.string().min(1).nullable(),
  })
  .strict();

const campaignAdminNotificationProjectionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("public_debate_campaign_welcome"),
      userId: z.string().min(1).nullable(),
      entityCui: z.string().min(1),
      entityName: z.string().min(1).nullable(),
      acceptedTermsAt: z.string().datetime().nullable(),
      triggerSource: z.enum(campaignAdminNotificationSourceValues).nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("public_debate_entity_subscription"),
      userId: z.string().min(1).nullable(),
      entityCui: z.string().min(1),
      entityName: z.string().min(1).nullable(),
      acceptedTermsAt: z.string().datetime().nullable(),
      selectedEntitiesCount: z.number().nonnegative().nullable(),
      triggerSource: z.enum(campaignAdminNotificationSourceValues).nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("public_debate_entity_update"),
      userId: z.string().min(1).nullable(),
      entityCui: z.string().min(1),
      entityName: z.string().min(1).nullable(),
      threadId: z.string().min(1),
      threadKey: z.string().min(1).nullable(),
      eventType: z.enum(campaignAdminNotificationEventTypeValues).nullable(),
      phase: z.string().min(1).nullable(),
      replyEntryId: z.string().min(1).nullable(),
      basedOnEntryId: z.string().min(1).nullable(),
      resolutionCode: z.string().min(1).nullable(),
      triggerSource: z.enum(campaignAdminNotificationSourceValues).nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("public_debate_admin_failure"),
      entityCui: z.string().min(1),
      entityName: z.string().min(1).nullable(),
      threadId: z.string().min(1),
      phase: z.string().min(1).nullable(),
    })
    .strict(),
]);

const campaignAdminNotificationListItemSchema = z
  .object({
    outboxId: z.string().min(1),
    campaignKey: z.literal("funky"),
    notificationType: z.string().min(1),
    templateId: z.string().min(1).nullable(),
    templateName: z.string().min(1).nullable(),
    templateVersion: z.string().min(1).nullable(),
    status: z.enum(campaignAdminNotificationStatusValues),
    createdAt: z.string().datetime(),
    sentAt: z.string().datetime().nullable(),
    attemptCount: z.number().nonnegative(),
    safeError: campaignAdminNotificationSafeErrorSchema,
    projection: campaignAdminNotificationProjectionSchema,
  })
  .strict();

const campaignAdminNotificationsListResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminNotificationListItemSchema),
        page: z
          .object({
            nextCursor: z.string().min(1).nullable(),
            hasMore: z.boolean(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const campaignAdminNotificationFieldDescriptorSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().min(1),
    required: z.boolean(),
  })
  .strict();

const campaignAdminNotificationTriggerDescriptorSchema = z
  .object({
    triggerId: z.string().min(1),
    campaignKey: z.literal("funky"),
    templateId: z.string().min(1),
    description: z.string().min(1),
    inputFields: z.array(campaignAdminNotificationFieldDescriptorSchema),
    targetKind: z.string().min(1),
  })
  .strict();

const campaignAdminNotificationTriggersResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminNotificationTriggerDescriptorSchema),
      })
      .strict(),
  })
  .strict();

const campaignAdminNotificationTriggerExecutionResultSchema = z
  .object({
    status: z.enum(campaignAdminNotificationTriggerExecutionStatusValues),
    reason: z.string().min(1).optional(),
    createdOutboxIds: z.array(z.string().min(1)),
    reusedOutboxIds: z.array(z.string().min(1)),
    queuedOutboxIds: z.array(z.string().min(1)),
    enqueueFailedOutboxIds: z.array(z.string().min(1)),
  })
  .strict();

const campaignAdminNotificationTriggerExecutionResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        triggerId: z.string().min(1),
        campaignKey: z.literal("funky"),
        templateId: z.string().min(1),
        result: campaignAdminNotificationTriggerExecutionResultSchema,
      })
      .strict(),
  })
  .strict();

export const campaignAdminNotificationTriggerExecutionBodySchema = z.record(
  z.string(),
  z.unknown(),
);

const campaignAdminNotificationTemplateDescriptorSchema = z
  .object({
    templateId: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
    description: z.string().min(1),
    requiredFields: z.array(campaignAdminNotificationFieldDescriptorSchema),
  })
  .strict();

const campaignAdminNotificationTemplatesResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminNotificationTemplateDescriptorSchema),
      })
      .strict(),
  })
  .strict();

const campaignAdminNotificationTemplatePreviewResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        templateId: z.string().min(1),
        name: z.string().min(1),
        version: z.string().min(1),
        description: z.string().min(1),
        requiredFields: z.array(campaignAdminNotificationFieldDescriptorSchema),
        exampleSubject: z.string().min(1),
        html: z.string().min(1),
        text: z.string(),
      })
      .strict(),
  })
  .strict();

const campaignAdminSubmitReviewsResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminInteractionListItemSchema),
      })
      .strict(),
  })
  .strict();

const campaignAdminMetaResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        availableInteractionTypes: z.array(
          campaignAdminAvailableInteractionTypeSchema,
        ),
        stats: campaignAdminMetaStatsSchema,
      })
      .strict(),
  })
  .strict();

const campaignAdminErrorEnvelopeSchema = z
  .object({
    ok: z.boolean().optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    code: z.string().optional(),
    retryable: z.boolean().optional(),
    details: z.unknown().optional(),
  })
  .strict();

const campaignAdminApproveReviewSchema = z
  .object({
    userId: z.string().min(1),
    recordKey: z.string().min(1),
    expectedUpdatedAt: z.string().datetime(),
    status: z.literal("approved"),
    feedbackText: z.string().min(1).optional(),
    approvalRiskAcknowledged: z.boolean().optional(),
  })
  .strict();

const campaignAdminRejectReviewSchema = z
  .object({
    userId: z.string().min(1),
    recordKey: z.string().min(1),
    expectedUpdatedAt: z.string().datetime(),
    status: z.literal("rejected"),
    feedbackText: z.string().min(1),
  })
  .strict();

export const campaignAdminSubmitReviewsBodySchema = z
  .object({
    items: z
      .array(
        z.union([
          campaignAdminApproveReviewSchema,
          campaignAdminRejectReviewSchema,
        ]),
      )
      .min(1)
      .max(100),
  })
  .strict();

export function parseCampaignAdminListResponse(
  payload: unknown,
): CampaignAdminListResponse {
  const parsedPayload = campaignAdminListResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin queue response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminUsersListResponse(
  payload: unknown,
): CampaignAdminUsersListResponse {
  const parsedPayload = campaignAdminUsersListResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin users response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminNotificationsListResponse(
  payload: unknown,
): CampaignAdminNotificationsListResponse {
  const parsedPayload =
    campaignAdminNotificationsListResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin notifications response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminEntitiesListResponse(
  payload: unknown,
): CampaignAdminEntitiesListResponse {
  const parsedPayload =
    campaignAdminEntitiesListResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin entities response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminNotificationTriggersResponse(
  payload: unknown,
): readonly CampaignAdminNotificationTriggerDescriptor[] {
  const parsedPayload =
    campaignAdminNotificationTriggersResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin notification triggers response.");
  }

  return parsedPayload.data.data.items;
}

export function parseCampaignAdminNotificationTriggerExecutionResponse(
  payload: unknown,
): CampaignAdminNotificationTriggerExecutionResponse {
  const parsedPayload =
    campaignAdminNotificationTriggerExecutionResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin notification trigger response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminNotificationTemplatesResponse(
  payload: unknown,
): readonly CampaignAdminNotificationTemplateDescriptor[] {
  const parsedPayload =
    campaignAdminNotificationTemplatesResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin notification templates response.");
  }

  return parsedPayload.data.data.items;
}

export function parseCampaignAdminNotificationTemplatePreviewResponse(
  payload: unknown,
): CampaignAdminNotificationTemplatePreview {
  const parsedPayload =
    campaignAdminNotificationTemplatePreviewResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error(
      "Invalid campaign admin notification template preview response.",
    );
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminSubmitReviewsResponse(
  payload: unknown,
): readonly CampaignAdminUserInteractionListItem[] {
  const parsedPayload =
    campaignAdminSubmitReviewsResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin review response.");
  }

  return parsedPayload.data.data.items;
}

export function parseCampaignAdminMetaResponse(
  payload: unknown,
): CampaignAdminMetaResponse {
  const parsedPayload = campaignAdminMetaResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin metadata response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminEntitiesMetaResponse(
  payload: unknown,
): CampaignAdminEntitiesMetaResponse {
  const parsedPayload =
    campaignAdminEntitiesMetaResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin entities metadata response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminErrorEnvelope(payload: unknown) {
  const parsedPayload = campaignAdminErrorEnvelopeSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return null;
  }

  return parsedPayload.data;
}

export function parseCampaignAdminSubmitReviewsBody(
  payload: unknown,
): CampaignAdminSubmitReviewsBody {
  return campaignAdminSubmitReviewsBodySchema.parse(payload);
}

export function parseCampaignAdminNotificationTriggerExecutionBody(
  payload: unknown,
): CampaignAdminNotificationTriggerExecutionBody {
  return campaignAdminNotificationTriggerExecutionBodySchema.parse(payload);
}
