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
  campaignAdminInstitutionThreadResponseStatusValues,
  campaignAdminInstitutionThreadStateValues,
  campaignAdminInstitutionThreadSubmissionPathValues,
  type CampaignAdminNotificationTemplateDescriptor,
  type CampaignAdminNotificationTemplatePreview,
  type CampaignAdminNotificationPlanResponse,
  type CampaignAdminNotificationPlanSendResponse,
  type CampaignAdminNotificationTriggerBulkExecutionBody,
  type CampaignAdminNotificationTriggerBulkExecutionResponse,
  type CampaignAdminNotificationTriggerDescriptor,
  type CampaignAdminNotificationTriggerExecutionBody,
  type CampaignAdminNotificationTriggerExecutionResponse,
  type CampaignAdminRunnableTemplateDescriptor,
  type CampaignAdminRunnableTemplateDryRunBody,
  type CampaignAdminEntitiesListResponse,
  type CampaignAdminEntitiesMetaResponse,
  type CampaignAdminAppendInstitutionThreadResponseBody,
  type CampaignAdminAppendInstitutionThreadResponseResult,
  type CampaignAdminInstitutionThreadDetail,
  type CampaignAdminInstitutionThreadsListResponse,
  type CampaignAdminNotificationsListResponse,
  type CampaignAdminNotificationsMetaResponse,
  type CampaignAdminMetaResponse,
  type CampaignAdminStatsInteractionsByTypeResponse,
  type CampaignAdminStatsOverview,
  type CampaignAdminStatsTopEntitiesResponse,
  campaignAdminReviewSourceValues,
  campaignAdminReviewStatusValues,
  campaignAdminRiskFlagValues,
  campaignAdminScopeTypeValues,
  campaignAdminStatsTopEntitiesSortByValues,
  campaignAdminSubmissionPathValues,
  type CampaignAdminUsersMetaResponse,
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
            totalCount: campaignAdminCountSchema,
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
            totalCount: campaignAdminCountSchema,
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

const campaignAdminUsersMetaResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        totalUsers: campaignAdminCountSchema,
        usersWithPendingReviews: campaignAdminCountSchema,
      })
      .strict(),
  })
  .strict();

const campaignAdminStatsOverviewResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        coverage: z
          .object({
            hasClientTelemetry: z.boolean(),
            hasNotificationAttribution: z.boolean(),
          })
          .strict(),
        users: z
          .object({
            totalUsers: campaignAdminCountSchema,
            usersWithPendingReviews: campaignAdminCountSchema,
          })
          .strict(),
        interactions: z
          .object({
            totalInteractions: campaignAdminCountSchema,
            interactionsWithInstitutionThread: campaignAdminCountSchema,
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
                awaitingReply: campaignAdminCountSchema,
                replyReceivedUnreviewed: campaignAdminCountSchema,
                manualFollowUpNeeded: campaignAdminCountSchema,
                resolvedPositive: campaignAdminCountSchema,
                resolvedNegative: campaignAdminCountSchema,
                closedNoResponse: campaignAdminCountSchema,
                failed: campaignAdminCountSchema,
                none: campaignAdminCountSchema,
              })
              .strict(),
          })
          .strict(),
        entities: z
          .object({
            totalEntities: campaignAdminCountSchema,
            entitiesWithPendingReviews: campaignAdminCountSchema,
            entitiesWithSubscribers: campaignAdminCountSchema,
            entitiesWithNotificationActivity: campaignAdminCountSchema,
            entitiesWithFailedNotifications: campaignAdminCountSchema,
          })
          .strict(),
        notifications: z
          .object({
            pendingDeliveryCount: campaignAdminCountSchema,
            failedDeliveryCount: campaignAdminCountSchema,
            deliveredCount: campaignAdminCountSchema,
            openedCount: campaignAdminCountSchema,
            clickedCount: campaignAdminCountSchema,
            suppressedCount: campaignAdminCountSchema,
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const campaignAdminStatsInteractionsByTypeResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(
          z
            .object({
              interactionId: z.string().min(1),
              label: z.string().min(1).nullable(),
              total: campaignAdminCountSchema,
              pending: campaignAdminCountSchema,
              approved: campaignAdminCountSchema,
              rejected: campaignAdminCountSchema,
              notReviewed: campaignAdminCountSchema,
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();

const campaignAdminStatsTopEntitiesResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        sortBy: z.enum(campaignAdminStatsTopEntitiesSortByValues),
        limit: z.number().int().min(1).max(25),
        items: z.array(
          z
            .object({
              entityCui: z.string().min(1),
              entityName: z.string().min(1).nullable(),
              interactionCount: campaignAdminCountSchema,
              userCount: campaignAdminCountSchema,
              pendingReviewCount: campaignAdminCountSchema,
            })
            .strict(),
        ),
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
            totalCount: campaignAdminCountSchema,
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
  z
    .object({
      kind: z.literal("admin_reviewed_interaction"),
      userId: z.string().min(1).nullable(),
      entityCui: z.string().min(1),
      entityName: z.string().min(1).nullable(),
      recordKey: z.string().min(1),
      interactionId: z.string().min(1),
      interactionLabel: z.string().min(1).nullable(),
      reviewStatus: z.enum(["approved", "rejected"]),
      reviewedAt: z.string().datetime(),
      hasFeedbackText: z.boolean(),
      nextStepCount: z.number().int().nonnegative(),
      triggerSource: z.enum(campaignAdminNotificationSourceValues).nullable(),
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
            totalCount: campaignAdminCountSchema,
            nextCursor: z.string().min(1).nullable(),
            hasMore: z.boolean(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const campaignAdminNotificationsMetaResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        pendingDeliveryCount: campaignAdminCountSchema,
        failedDeliveryCount: campaignAdminCountSchema,
        replyReceivedCount: campaignAdminCountSchema,
      })
      .strict(),
  })
  .strict();

const campaignAdminInstitutionThreadListItemSchema = z
  .object({
    id: z.string().min(1),
    entityCui: z.string().min(1),
    entityName: z.string().nullable(),
    campaignKey: z.literal("funky"),
    submissionPath: z.enum(campaignAdminInstitutionThreadSubmissionPathValues),
    ownerUserId: z.string().min(1).nullable(),
    institutionEmail: z.string().min(1),
    subject: z.string(),
    threadState: z.enum(campaignAdminInstitutionThreadStateValues),
    currentResponseStatus: z
      .enum(campaignAdminInstitutionThreadResponseStatusValues)
      .nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    latestResponseAt: z.string().datetime().nullable(),
    responseEventCount: campaignAdminCountSchema,
  })
  .strict();

const campaignAdminInstitutionThreadsListResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminInstitutionThreadListItemSchema),
        page: z
          .object({
            limit: z.number().int().min(1).max(100),
            totalCount: campaignAdminCountSchema,
            hasMore: z.boolean(),
            nextCursor: z.string().min(1).nullable(),
            sortBy: z.literal("updatedAt"),
            sortOrder: z.literal("desc"),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const campaignAdminInstitutionThreadResponseEventSchema = z
  .object({
    id: z.string().min(1),
    responseDate: z.string().datetime(),
    messageContent: z.string(),
    responseStatus: z.enum(campaignAdminInstitutionThreadResponseStatusValues),
    actorUserId: z.string().min(1),
    createdAt: z.string().datetime(),
    source: z.literal("campaign_admin_api"),
  })
  .strict();

const campaignAdminInstitutionThreadCorrespondenceAttachmentSchema = z
  .object({
    id: z.string().min(1),
    filename: z.string().min(1),
    contentType: z.string().min(1),
    contentDisposition: z.string().nullable(),
    contentId: z.string().nullable(),
  })
  .strict();

const campaignAdminInstitutionThreadCorrespondenceEntrySchema = z
  .object({
    id: z.string().min(1),
    direction: z.enum(["outbound", "inbound"]),
    source: z.enum(["platform_send", "self_send_cc", "institution_reply"]),
    fromAddress: z.string().min(1),
    subject: z.string(),
    textBody: z.string().nullable(),
    attachments: z.array(
      campaignAdminInstitutionThreadCorrespondenceAttachmentSchema,
    ),
    occurredAt: z.string().datetime(),
  })
  .strict();

const campaignAdminInstitutionThreadDetailSchema = z
  .object({
    id: z.string().min(1),
    entityCui: z.string().min(1),
    entityName: z.string().nullable(),
    campaignKey: z.literal("funky"),
    submissionPath: z.enum(campaignAdminInstitutionThreadSubmissionPathValues),
    ownerUserId: z.string().min(1).nullable(),
    institutionEmail: z.string().min(1),
    subject: z.string(),
    threadState: z.enum(campaignAdminInstitutionThreadStateValues),
    currentResponseStatus: z
      .enum(campaignAdminInstitutionThreadResponseStatusValues)
      .nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    latestResponseAt: z.string().datetime().nullable(),
    responseEventCount: campaignAdminCountSchema,
    requesterOrganizationName: z.string().nullable(),
    budgetPublicationDate: z.string().nullable(),
    consentCapturedAt: z.string().datetime().nullable(),
    contestationDeadlineAt: z.string().datetime().nullable(),
    responseEvents: z.array(campaignAdminInstitutionThreadResponseEventSchema),
    correspondence: z.array(
      campaignAdminInstitutionThreadCorrespondenceEntrySchema,
    ),
  })
  .strict();

const campaignAdminInstitutionThreadDetailResponseSchema = z
  .object({
    ok: z.literal(true),
    data: campaignAdminInstitutionThreadDetailSchema,
  })
  .strict();

const campaignAdminAppendInstitutionThreadResponseBodySchema = z
  .object({
    expectedUpdatedAt: z.string().datetime(),
    responseDate: z.string().datetime(),
    messageContent: z.string().min(1),
    responseStatus: z.enum(campaignAdminInstitutionThreadResponseStatusValues),
  })
  .strict();

const campaignAdminAppendInstitutionThreadResponseSchema = z
  .object({
    ok: z.literal(true),
    data: campaignAdminInstitutionThreadDetailSchema
      .extend({
        createdResponseEventId: z.string().min(1),
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

const campaignAdminNotificationTriggerCapabilitiesSchema = z
  .object({
    supportsSingleExecution: z.boolean(),
    supportsBulkExecution: z.boolean(),
    supportsDryRun: z.boolean(),
    defaultLimit: z.number().int().min(1).optional(),
    maxLimit: z.number().int().min(1).optional(),
    bulkInputFields: z
      .array(campaignAdminNotificationFieldDescriptorSchema)
      .optional(),
  })
  .strict();

const campaignAdminNotificationTriggerDescriptorSchema = z
  .object({
    triggerId: z.string().min(1),
    campaignKey: z.literal("funky"),
    familyId: z.string().min(1).optional(),
    templateId: z.string().min(1),
    description: z.string().min(1),
    inputFields: z.array(campaignAdminNotificationFieldDescriptorSchema),
    targetKind: z.string().min(1),
    capabilities: campaignAdminNotificationTriggerCapabilitiesSchema.optional(),
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

const campaignAdminNotificationTriggerLegacyExecutionResultSchema = z
  .object({
    status: z.enum(["queued", "skipped", "partial"]),
    reason: z.string().min(1).optional(),
    createdOutboxIds: z.array(z.string().min(1)),
    reusedOutboxIds: z.array(z.string().min(1)),
    queuedOutboxIds: z.array(z.string().min(1)),
    enqueueFailedOutboxIds: z.array(z.string().min(1)),
  })
  .strict();

const campaignAdminNotificationTriggerFamilySingleExecutionResultSchema = z
  .object({
    kind: z.literal("family_single"),
    familyId: z.string().min(1),
    status: z.enum(campaignAdminNotificationTriggerExecutionStatusValues),
    reason: z.string().min(1),
    delegateTarget: z.string().min(1).optional(),
    createdOutboxIds: z.array(z.string().min(1)),
    reusedOutboxIds: z.array(z.string().min(1)),
    queuedOutboxIds: z.array(z.string().min(1)),
    enqueueFailedOutboxIds: z.array(z.string().min(1)),
  })
  .strict();

const campaignAdminNotificationTriggerExecutionResultSchema = z.union([
  campaignAdminNotificationTriggerLegacyExecutionResultSchema,
  campaignAdminNotificationTriggerFamilySingleExecutionResultSchema,
]);

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

export const campaignAdminNotificationTriggerBulkExecutionBodySchema = z
  .object({
    filters: z.record(z.string(), z.unknown()),
    dryRun: z.boolean().optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  })
  .strict();

const campaignAdminNotificationTriggerBulkExecutionResultSchema = z
  .object({
    kind: z.literal("family_bulk"),
    familyId: z.string().min(1),
    dryRun: z.boolean(),
    watermark: z.string().min(1),
    limit: z.number().int().min(1),
    hasMoreCandidates: z.boolean(),
    candidateCount: z.number().int().nonnegative(),
    plannedCount: z.number().int().nonnegative(),
    eligibleCount: z.number().int().nonnegative(),
    queuedCount: z.number().int().nonnegative(),
    reusedCount: z.number().int().nonnegative(),
    skippedCount: z.number().int().nonnegative(),
    delegatedCount: z.number().int().nonnegative(),
    ineligibleCount: z.number().int().nonnegative(),
    notReplayableCount: z.number().int().nonnegative(),
    staleCount: z.number().int().nonnegative(),
    enqueueFailedCount: z.number().int().nonnegative(),
  })
  .strict();

const campaignAdminNotificationTriggerBulkExecutionResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        triggerId: z.string().min(1),
        campaignKey: z.literal("funky"),
        templateId: z.string().min(1),
        result: campaignAdminNotificationTriggerBulkExecutionResultSchema,
      })
      .strict(),
  })
  .strict();

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

const campaignAdminRunnableTemplateDescriptorSchema = z
  .object({
    runnableId: z.string().min(1),
    campaignKey: z.literal("funky"),
    templateId: z.string().min(1),
    templateVersion: z.string().min(1),
    description: z.string().min(1),
    targetKind: z.string().min(1),
    selectors: z.array(campaignAdminNotificationFieldDescriptorSchema),
    filters: z.array(campaignAdminNotificationFieldDescriptorSchema),
    dryRunRequired: z.boolean(),
    maxPlanRowCount: z.number().int().nonnegative(),
    defaultPageSize: z.number().int().min(1),
    maxPageSize: z.number().int().min(1),
  })
  .strict();

const campaignAdminRunnableTemplatesResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        items: z.array(campaignAdminRunnableTemplateDescriptorSchema),
      })
      .strict(),
  })
  .strict();

export const campaignAdminRunnableTemplateDryRunBodySchema = z
  .object({
    selectors: z.record(z.string(), z.string()).optional(),
    filters: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const campaignAdminNotificationPlanSummarySchema = z
  .object({
    totalRowCount: campaignAdminCountSchema,
    willSendCount: campaignAdminCountSchema,
    alreadySentCount: campaignAdminCountSchema,
    alreadyPendingCount: campaignAdminCountSchema,
    ineligibleCount: campaignAdminCountSchema,
    missingDataCount: campaignAdminCountSchema,
  })
  .strict();

const campaignAdminNotificationPlanRowSchema = z
  .object({
    rowKey: z.string().min(1),
    userId: z.string().min(1),
    entityCui: z.string().min(1).nullable(),
    entityName: z.string().nullable(),
    recordKey: z.string().min(1).nullable(),
    interactionId: z.string().min(1).nullable(),
    interactionLabel: z.string().nullable(),
    reviewStatus: z.enum(["approved", "rejected"]).nullable(),
    reviewedAt: z.string().datetime().nullable(),
    status: z.enum([
      "will_send",
      "already_sent",
      "already_pending",
      "ineligible",
      "missing_data",
    ]),
    reasonCode: z.string().min(1),
    statusMessage: z.string().min(1),
    hasExistingDelivery: z.boolean(),
    existingDeliveryStatus: z.string().min(1).nullable(),
    sendMode: z.enum(["create", "reuse_claimable"]).nullable(),
  })
  .strict();

const campaignAdminNotificationPlanResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        planId: z.string().min(1),
        runnableId: z.string().min(1),
        templateId: z.string().min(1),
        watermark: z.string().min(1),
        summary: campaignAdminNotificationPlanSummarySchema,
        rows: z.array(campaignAdminNotificationPlanRowSchema),
        page: z
          .object({
            totalCount: campaignAdminCountSchema,
            nextCursor: z.string().min(1).nullable(),
            hasMore: z.boolean(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const campaignAdminNotificationPlanSendResponseSchema = z
  .object({
    ok: z.literal(true),
    data: z
      .object({
        planId: z.string().min(1),
        runnableId: z.string().min(1),
        templateId: z.string().min(1),
        evaluatedCount: campaignAdminCountSchema,
        queuedCount: campaignAdminCountSchema,
        alreadySentCount: campaignAdminCountSchema,
        alreadyPendingCount: campaignAdminCountSchema,
        ineligibleCount: campaignAdminCountSchema,
        missingDataCount: campaignAdminCountSchema,
        enqueueFailedCount: campaignAdminCountSchema,
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
    send_notification: z.boolean().optional(),
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

export function parseCampaignAdminUsersMetaResponse(
  payload: unknown,
): CampaignAdminUsersMetaResponse {
  const parsedPayload = campaignAdminUsersMetaResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin users metadata response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminStatsOverviewResponse(
  payload: unknown,
): CampaignAdminStatsOverview {
  const parsedPayload =
    campaignAdminStatsOverviewResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin stats overview response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminStatsInteractionsByTypeResponse(
  payload: unknown,
): CampaignAdminStatsInteractionsByTypeResponse {
  const parsedPayload =
    campaignAdminStatsInteractionsByTypeResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error(
      "Invalid campaign admin stats interactions-by-type response.",
    );
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminStatsTopEntitiesResponse(
  payload: unknown,
): CampaignAdminStatsTopEntitiesResponse {
  const parsedPayload =
    campaignAdminStatsTopEntitiesResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin stats top entities response.");
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

export function parseCampaignAdminNotificationsMetaResponse(
  payload: unknown,
): CampaignAdminNotificationsMetaResponse {
  const parsedPayload =
    campaignAdminNotificationsMetaResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin notifications metadata response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminInstitutionThreadsListResponse(
  payload: unknown,
): CampaignAdminInstitutionThreadsListResponse {
  const parsedPayload =
    campaignAdminInstitutionThreadsListResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin institution threads response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminInstitutionThreadDetailResponse(
  payload: unknown,
): CampaignAdminInstitutionThreadDetail {
  const parsedPayload =
    campaignAdminInstitutionThreadDetailResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin institution thread detail response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminAppendInstitutionThreadResponse(
  payload: unknown,
): CampaignAdminAppendInstitutionThreadResponseResult {
  const parsedPayload =
    campaignAdminAppendInstitutionThreadResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error(
      "Invalid campaign admin institution thread response append result.",
    );
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

export function parseCampaignAdminRunnableTemplatesResponse(
  payload: unknown,
): readonly CampaignAdminRunnableTemplateDescriptor[] {
  const parsedPayload =
    campaignAdminRunnableTemplatesResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin runnable templates response.");
  }

  return parsedPayload.data.data.items;
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

export function parseCampaignAdminNotificationTriggerBulkExecutionResponse(
  payload: unknown,
): CampaignAdminNotificationTriggerBulkExecutionResponse {
  const parsedPayload =
    campaignAdminNotificationTriggerBulkExecutionResponseSchema.safeParse(
      payload,
    );
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin notification bulk trigger response.");
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

export function parseCampaignAdminRunnableTemplateDryRunBody(
  payload: unknown,
): CampaignAdminRunnableTemplateDryRunBody {
  const parsedPayload = campaignAdminRunnableTemplateDryRunBodySchema.safeParse(
    payload,
  );
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin runnable template dry-run body.");
  }

  return parsedPayload.data;
}

export function parseCampaignAdminNotificationPlanResponse(
  payload: unknown,
): CampaignAdminNotificationPlanResponse {
  const parsedPayload =
    campaignAdminNotificationPlanResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin notification plan response.");
  }

  return parsedPayload.data.data;
}

export function parseCampaignAdminNotificationPlanSendResponse(
  payload: unknown,
): CampaignAdminNotificationPlanSendResponse {
  const parsedPayload =
    campaignAdminNotificationPlanSendResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Invalid campaign admin notification plan send response.");
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

export function parseCampaignAdminAppendInstitutionThreadResponseBody(
  payload: unknown,
): CampaignAdminAppendInstitutionThreadResponseBody {
  return campaignAdminAppendInstitutionThreadResponseBodySchema.parse(payload);
}

export function parseCampaignAdminNotificationTriggerExecutionBody(
  payload: unknown,
): CampaignAdminNotificationTriggerExecutionBody {
  return campaignAdminNotificationTriggerExecutionBodySchema.parse(payload);
}

export function parseCampaignAdminNotificationTriggerBulkExecutionBody(
  payload: unknown,
): CampaignAdminNotificationTriggerBulkExecutionBody {
  return campaignAdminNotificationTriggerBulkExecutionBodySchema.parse(payload);
}
