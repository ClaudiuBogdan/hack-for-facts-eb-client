export const campaignAdminPhaseValues = [
  "idle",
  "draft",
  "pending",
  "resolved",
  "failed",
] as const;

export const campaignAdminReviewStatusValues = [
  "pending",
  "approved",
  "rejected",
] as const;

export const campaignAdminScopeTypeValues = ["global", "entity"] as const;

export const campaignAdminPayloadKindValues = [
  "choice",
  "text",
  "url",
  "number",
  "json",
] as const;

export const campaignAdminSubmissionPathValues = [
  "request_platform",
  "send_yourself",
  "send_email",
  "download_text",
] as const;

export const campaignAdminRiskFlagValues = [
  "invalid_institution_email",
  "institution_email_mismatch",
  "missing_official_email",
  "institution_thread_failed",
] as const;

export const campaignAdminPendingReasonValues = [
  "invalid_institution_email",
  "missing_official_email",
  "institution_email_mismatch",
  "institution_thread_failed",
  "awaiting_manual_review",
] as const;

export const campaignAdminReviewSourceValues = [
  "campaign_admin_api",
  "learning_progress_admin_api",
  "user_event_worker",
] as const;

export const campaignAdminThreadPhaseValues = [
  "sending",
  "awaiting_reply",
  "reply_received_unreviewed",
  "manual_follow_up_needed",
  "resolved_positive",
  "resolved_negative",
  "closed_no_response",
  "failed",
] as const;

export const campaignAdminMetaReviewStatusCountValues = [
  ...campaignAdminReviewStatusValues,
  "notReviewed",
] as const;

export const campaignAdminMetaThreadPhaseCountValues = [
  ...campaignAdminThreadPhaseValues,
  "none",
] as const;

export const campaignAdminUserInteractionsSortKeyValues = [
  "reviewStatus",
  "userId",
  "organizationName",
  "entity",
  "updatedAt",
  "riskFlagCount",
  "threadPhase",
  "interactionType",
  "value",
  "reviewState",
  "reviewedByUserId",
] as const;

export const campaignAdminUsersSortKeyValues = [
  "userId",
  "latestUpdatedAt",
  "interactionCount",
  "pendingReviewCount",
] as const;

export const campaignAdminEntitiesSortKeyValues = [
  "entityCui",
  "userCount",
  "interactionCount",
  "pendingReviewCount",
  "notificationSubscriberCount",
  "notificationOutboxCount",
  "latestInteractionAt",
  "latestNotificationAt",
] as const;

export const campaignAdminEntityNotificationTypeValues = [
  "funky:outbox:welcome",
  "funky:outbox:entity_subscription",
  "funky:outbox:entity_update",
  "funky:outbox:admin_reviewed_interaction",
] as const;

export const campaignAdminNotificationStatusValues = [
  "pending",
  "composing",
  "sending",
  "sent",
  "delivered",
  "webhook_timeout",
  "failed_transient",
  "failed_permanent",
  "suppressed",
  "skipped_unsubscribed",
  "skipped_no_email",
] as const;

export const campaignAdminNotificationEventTypeValues = [
  "thread_started",
  "thread_failed",
  "reply_received",
  "reply_reviewed",
] as const;

export const campaignAdminNotificationSourceValues = [
  "campaign_admin",
  "user_event_worker",
  "system",
  "clerk_webhook",
] as const;

export const campaignAdminNotificationSafeErrorCategoryValues = [
  "skipped_unsubscribed",
  "skipped_no_email",
  "suppressed",
  "webhook_timeout",
  "compose_validation",
  "render_error",
  "email_lookup",
  "send_retryable",
  "send_permanent",
  "provider_bounce",
  "provider_suppressed",
  "unknown",
] as const;

export const campaignAdminNotificationProjectionKindValues = [
  "public_debate_campaign_welcome",
  "public_debate_entity_subscription",
  "public_debate_entity_update",
  "public_debate_admin_failure",
  "admin_reviewed_interaction",
] as const;

export const campaignAdminNotificationSortKeyValues = [
  "createdAt",
  "sentAt",
  "status",
  "attemptCount",
] as const;

export const campaignAdminNotificationsTabValues = [
  "audit",
  "triggers",
  "templates",
] as const;

export const campaignAdminNotificationTriggerExecutionStatusValues = [
  "queued",
  "skipped",
  "partial",
  "delegated",
] as const;

export const campaignAdminNotificationTriggerModeValues = [
  "single",
  "bulk",
] as const;

export type CampaignAdminPhase = (typeof campaignAdminPhaseValues)[number];
export type CampaignAdminReviewStatus =
  (typeof campaignAdminReviewStatusValues)[number];
export type CampaignAdminScopeType =
  (typeof campaignAdminScopeTypeValues)[number];
export type CampaignAdminPayloadKind =
  (typeof campaignAdminPayloadKindValues)[number];
export type CampaignAdminSubmissionPath =
  (typeof campaignAdminSubmissionPathValues)[number];
export type CampaignAdminRiskFlag =
  (typeof campaignAdminRiskFlagValues)[number];
export type CampaignAdminPendingReason =
  (typeof campaignAdminPendingReasonValues)[number];
export type CampaignAdminReviewSource =
  (typeof campaignAdminReviewSourceValues)[number];
export type CampaignAdminThreadPhase =
  (typeof campaignAdminThreadPhaseValues)[number];
export type CampaignAdminMetaReviewStatusCountKey =
  (typeof campaignAdminMetaReviewStatusCountValues)[number];
export type CampaignAdminMetaThreadPhaseCountKey =
  (typeof campaignAdminMetaThreadPhaseCountValues)[number];
export type CampaignAdminUserInteractionsSortKey =
  (typeof campaignAdminUserInteractionsSortKeyValues)[number];
export type CampaignAdminUsersSortKey =
  (typeof campaignAdminUsersSortKeyValues)[number];
export type CampaignAdminEntitiesSortKey =
  (typeof campaignAdminEntitiesSortKeyValues)[number];
export type CampaignAdminEntityNotificationType =
  (typeof campaignAdminEntityNotificationTypeValues)[number];
export type CampaignAdminNotificationStatus =
  (typeof campaignAdminNotificationStatusValues)[number];
export type CampaignAdminNotificationEventType =
  (typeof campaignAdminNotificationEventTypeValues)[number];
export type CampaignAdminNotificationSource =
  (typeof campaignAdminNotificationSourceValues)[number];
export type CampaignAdminNotificationSafeErrorCategory =
  (typeof campaignAdminNotificationSafeErrorCategoryValues)[number];
export type CampaignAdminNotificationProjectionKind =
  (typeof campaignAdminNotificationProjectionKindValues)[number];
export type CampaignAdminNotificationSortKey =
  (typeof campaignAdminNotificationSortKeyValues)[number];
export type CampaignAdminNotificationsTab =
  (typeof campaignAdminNotificationsTabValues)[number];
export type CampaignAdminNotificationTriggerExecutionStatus =
  (typeof campaignAdminNotificationTriggerExecutionStatusValues)[number];
export type CampaignAdminNotificationTriggerMode =
  (typeof campaignAdminNotificationTriggerModeValues)[number];
export type CampaignAdminSortOrder = "asc" | "desc";
export type CampaignAdminCampaignKey = "funky";
export type CampaignAdminReviewDecision = Exclude<
  CampaignAdminReviewStatus,
  "pending"
>;

export type CampaignAdminPayloadSummary =
  | {
      readonly kind: "public_debate_request";
      readonly institutionEmail: string | null;
      readonly organizationName: string | null;
      readonly submissionPath: CampaignAdminSubmissionPath | null;
      readonly isNgo: boolean | null;
    }
  | {
      readonly kind: "website_url";
      readonly websiteUrl: string | null;
    }
  | {
      readonly kind: "budget_document";
      readonly documentUrl: string | null;
      readonly documentTypes: ReadonlyArray<
        "pdf" | "word" | "excel" | "webpage" | "graphics" | "other"
      >;
    }
  | {
      readonly kind: "budget_publication_date";
      readonly publicationDate: string | null;
      readonly sources: ReadonlyArray<{
        readonly type: "website" | "press" | "social_media" | "other";
        readonly url: string | null;
      }>;
    }
  | {
      readonly kind: "budget_status";
      readonly isPublished: "yes" | "no" | "dont_know" | null;
      readonly budgetStage: "draft" | "approved" | null;
    }
  | {
      readonly kind: "city_hall_contact";
      readonly email: string | null;
      readonly phone: string | null;
    }
  | {
      readonly kind: "participation_report";
      readonly debateTookPlace: "yes" | "no" | "dont_know" | null;
      readonly approximateAttendees: number | null;
      readonly citizensAllowedToSpeak: "yes" | "no" | "partially" | null;
      readonly citizenInputsRecorded: "yes" | "no" | "dont_know" | null;
      readonly observations: string | null;
    }
  | {
      readonly kind: "quiz";
      readonly selectedOptionId: string | null;
      readonly outcome: "correct" | "incorrect" | null;
      readonly score: number | null;
    }
  | {
      readonly kind: "contestation";
      readonly contestedItem: string | null;
      readonly reasoning: string | null;
      readonly impact: string | null;
      readonly proposedChange: string | null;
      readonly senderName: string | null;
      readonly submissionPath: CampaignAdminSubmissionPath | null;
      readonly institutionEmail: string | null;
    };

export type CampaignAdminAvailableInteractionType = {
  readonly interactionId: string;
  readonly label: string | null;
  readonly reviewable?: boolean;
};

export type CampaignAdminInteractionMetaStats = {
  readonly total: number;
  readonly riskFlagged: number;
  readonly withInstitutionThread: number;
  readonly reviewStatusCounts: Readonly<
    Record<CampaignAdminMetaReviewStatusCountKey, number>
  >;
  readonly phaseCounts: Readonly<Record<CampaignAdminPhase, number>>;
  readonly threadPhaseCounts: Readonly<
    Record<CampaignAdminMetaThreadPhaseCountKey, number>
  >;
};

export const EMPTY_CAMPAIGN_ADMIN_META_STATS: CampaignAdminInteractionMetaStats =
  {
    total: 0,
    riskFlagged: 0,
    withInstitutionThread: 0,
    reviewStatusCounts: {
      pending: 0,
      approved: 0,
      rejected: 0,
      notReviewed: 0,
    },
    phaseCounts: {
      idle: 0,
      draft: 0,
      pending: 0,
      resolved: 0,
      failed: 0,
    },
    threadPhaseCounts: {
      sending: 0,
      awaiting_reply: 0,
      reply_received_unreviewed: 0,
      manual_follow_up_needed: 0,
      resolved_positive: 0,
      resolved_negative: 0,
      closed_no_response: 0,
      failed: 0,
      none: 0,
    },
  };

export type CampaignAdminUserInteractionListItem = {
  readonly userId: string;
  readonly recordKey: string;
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly interactionId: string;
  readonly lessonId: string;
  readonly entityCui: string | null;
  readonly entityName: string | null;
  readonly scopeType: CampaignAdminScopeType;
  readonly phase: CampaignAdminPhase;
  readonly reviewStatus: CampaignAdminReviewStatus | null;
  readonly reviewable?: boolean;
  readonly pendingReason: CampaignAdminPendingReason | null;
  readonly submittedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
  readonly reviewedByUserId: string | null;
  readonly reviewSource: CampaignAdminReviewSource | null;
  readonly feedbackText: string | null;
  readonly payloadKind: CampaignAdminPayloadKind | null;
  readonly payloadSummary: CampaignAdminPayloadSummary | null;
  readonly institutionEmail: string | null;
  readonly websiteUrl: string | null;
  readonly organizationName: string | null;
  readonly interactionElementLink: string | null;
  readonly submissionPath: CampaignAdminSubmissionPath | null;
  readonly isNgo: boolean | null;
  readonly riskFlags: readonly CampaignAdminRiskFlag[];
  readonly threadId: string | null;
  readonly threadPhase: CampaignAdminThreadPhase | null;
  readonly lastEmailAt: string | null;
  readonly lastReplyAt: string | null;
  readonly nextActionAt: string | null;
  readonly submittedEventCount: number;
  readonly evaluatedEventCount: number;
  readonly lastAuditAt: string | null;
};

export type CampaignAdminListResponse = {
  readonly items: readonly CampaignAdminUserInteractionListItem[];
  readonly page: {
    readonly limit: number;
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
    readonly sortBy?: CampaignAdminUserInteractionsSortKey;
    readonly sortOrder?: CampaignAdminSortOrder;
  };
};

export type CampaignAdminUserListItem = {
  readonly userId: string;
  readonly interactionCount: number;
  readonly pendingReviewCount: number;
  readonly latestUpdatedAt: string;
  readonly latestInteractionId: string | null;
  readonly latestEntityCui: string | null;
  readonly latestEntityName: string | null;
};

export type CampaignAdminUsersListResponse = {
  readonly items: readonly CampaignAdminUserListItem[];
  readonly page: {
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
    readonly sortBy?: CampaignAdminUsersSortKey;
    readonly sortOrder?: CampaignAdminSortOrder;
  };
};

export type CampaignAdminUsersMetaResponse = {
  readonly totalUsers: number;
  readonly usersWithPendingReviews: number;
};

export type CampaignAdminMetaResponse = {
  readonly availableInteractionTypes: readonly CampaignAdminAvailableInteractionType[];
  readonly stats: CampaignAdminInteractionMetaStats;
};

export type CampaignAdminEntityListItem = {
  readonly entityCui: string;
  readonly entityName: string | null;
  readonly userCount: number;
  readonly interactionCount: number;
  readonly pendingReviewCount: number;
  readonly notificationSubscriberCount: number;
  readonly notificationOutboxCount: number;
  readonly failedNotificationCount: number;
  readonly latestInteractionAt: string | null;
  readonly latestInteractionId: string | null;
  readonly latestNotificationAt: string | null;
  readonly latestNotificationType: string | null;
  readonly latestNotificationStatus: CampaignAdminNotificationStatus | null;
  readonly hasPendingReviews: boolean;
  readonly hasSubscribers: boolean;
  readonly hasNotificationActivity: boolean;
  readonly hasFailedNotifications: boolean;
};

export type CampaignAdminEntitiesListResponse = {
  readonly items: readonly CampaignAdminEntityListItem[];
  readonly page: {
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
    readonly sortBy: CampaignAdminEntitiesSortKey;
    readonly sortOrder: CampaignAdminSortOrder;
  };
};

export type CampaignAdminEntitiesMetaResponse = {
  readonly totalEntities: number;
  readonly entitiesWithPendingReviews: number;
  readonly entitiesWithSubscribers: number;
  readonly entitiesWithNotificationActivity: number;
  readonly entitiesWithFailedNotifications: number;
  readonly availableInteractionTypes: readonly CampaignAdminAvailableInteractionType[];
};

export type CampaignAdminSubmitReviewItem =
  | {
      readonly userId: string;
      readonly recordKey: string;
      readonly expectedUpdatedAt: string;
      readonly status: "approved";
      readonly feedbackText?: string;
      readonly approvalRiskAcknowledged?: boolean;
    }
  | {
      readonly userId: string;
      readonly recordKey: string;
      readonly expectedUpdatedAt: string;
      readonly status: "rejected";
      readonly feedbackText: string;
    };

export type CampaignAdminSubmitReviewsBody = {
  readonly items: readonly CampaignAdminSubmitReviewItem[];
  readonly send_notification?: boolean;
};

export type CampaignAdminNotificationSafeError = {
  readonly category: CampaignAdminNotificationSafeErrorCategory | null;
  readonly code: string | null;
};

export type CampaignAdminNotificationProjection =
  | {
      readonly kind: "public_debate_campaign_welcome";
      readonly userId: string | null;
      readonly entityCui: string;
      readonly entityName: string | null;
      readonly acceptedTermsAt: string | null;
      readonly triggerSource: CampaignAdminNotificationSource | null;
    }
  | {
      readonly kind: "public_debate_entity_subscription";
      readonly userId: string | null;
      readonly entityCui: string;
      readonly entityName: string | null;
      readonly acceptedTermsAt: string | null;
      readonly selectedEntitiesCount: number | null;
      readonly triggerSource: CampaignAdminNotificationSource | null;
    }
  | {
      readonly kind: "public_debate_entity_update";
      readonly userId: string | null;
      readonly entityCui: string;
      readonly entityName: string | null;
      readonly threadId: string;
      readonly threadKey: string | null;
      readonly eventType: CampaignAdminNotificationEventType | null;
      readonly phase: string | null;
      readonly replyEntryId: string | null;
      readonly basedOnEntryId: string | null;
      readonly resolutionCode: string | null;
      readonly triggerSource: CampaignAdminNotificationSource | null;
    }
  | {
      readonly kind: "public_debate_admin_failure";
      readonly entityCui: string;
      readonly entityName: string | null;
      readonly threadId: string;
      readonly phase: string | null;
    }
  | {
      readonly kind: "admin_reviewed_interaction";
      readonly userId: string | null;
      readonly entityCui: string;
      readonly entityName: string | null;
      readonly recordKey: string;
      readonly interactionId: string;
      readonly interactionLabel: string | null;
      readonly reviewStatus: Exclude<CampaignAdminReviewStatus, "pending">;
      readonly reviewedAt: string;
      readonly hasFeedbackText: boolean;
      readonly nextStepCount: number;
      readonly triggerSource: CampaignAdminNotificationSource | null;
    };

export type CampaignAdminNotificationListItem = {
  readonly outboxId: string;
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly notificationType: string;
  readonly templateId: string | null;
  readonly templateName: string | null;
  readonly templateVersion: string | null;
  readonly status: CampaignAdminNotificationStatus;
  readonly createdAt: string;
  readonly sentAt: string | null;
  readonly attemptCount: number;
  readonly safeError: CampaignAdminNotificationSafeError;
  readonly projection: CampaignAdminNotificationProjection;
};

export type CampaignAdminNotificationsListResponse = {
  readonly items: readonly CampaignAdminNotificationListItem[];
  readonly page: {
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
  };
};

export type CampaignAdminNotificationsMetaResponse = {
  readonly pendingDeliveryCount: number;
  readonly failedDeliveryCount: number;
  readonly replyReceivedCount: number;
};

export type CampaignAdminNotificationFieldDescriptor = {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
};

export type CampaignAdminNotificationTriggerCapabilities = {
  readonly supportsSingleExecution: boolean;
  readonly supportsBulkExecution: boolean;
  readonly supportsDryRun: boolean;
  readonly defaultLimit?: number;
  readonly maxLimit?: number;
  readonly bulkInputFields?: readonly CampaignAdminNotificationFieldDescriptor[];
};

export type CampaignAdminNotificationTriggerDescriptor = {
  readonly triggerId: string;
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly familyId?: string;
  readonly templateId: string;
  readonly description: string;
  readonly inputFields: readonly CampaignAdminNotificationFieldDescriptor[];
  readonly targetKind: string;
  readonly capabilities?: CampaignAdminNotificationTriggerCapabilities;
};

export type CampaignAdminNotificationTriggerLegacyExecutionResult = {
  readonly status: Exclude<
    CampaignAdminNotificationTriggerExecutionStatus,
    "delegated"
  >;
  readonly reason?: string;
  readonly createdOutboxIds: readonly string[];
  readonly reusedOutboxIds: readonly string[];
  readonly queuedOutboxIds: readonly string[];
  readonly enqueueFailedOutboxIds: readonly string[];
};

export type CampaignAdminNotificationTriggerFamilySingleExecutionResult = {
  readonly kind: "family_single";
  readonly familyId: string;
  readonly status: CampaignAdminNotificationTriggerExecutionStatus;
  readonly reason: string;
  readonly delegateTarget?: string;
  readonly createdOutboxIds: readonly string[];
  readonly reusedOutboxIds: readonly string[];
  readonly queuedOutboxIds: readonly string[];
  readonly enqueueFailedOutboxIds: readonly string[];
};

export type CampaignAdminNotificationTriggerExecutionResult =
  | CampaignAdminNotificationTriggerLegacyExecutionResult
  | CampaignAdminNotificationTriggerFamilySingleExecutionResult;

export type CampaignAdminNotificationTriggerExecutionResponse = {
  readonly triggerId: string;
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly templateId: string;
  readonly result: CampaignAdminNotificationTriggerExecutionResult;
};

export type CampaignAdminNotificationTriggerExecutionBody = Readonly<
  Record<string, unknown>
>;

export type CampaignAdminNotificationTriggerBulkExecutionBody = {
  readonly filters: Readonly<Record<string, unknown>>;
  readonly dryRun?: boolean;
  readonly limit?: number;
};

export type CampaignAdminNotificationTriggerBulkExecutionResult = {
  readonly kind: "family_bulk";
  readonly familyId: string;
  readonly dryRun: boolean;
  readonly watermark: string;
  readonly limit: number;
  readonly hasMoreCandidates: boolean;
  readonly candidateCount: number;
  readonly plannedCount: number;
  readonly eligibleCount: number;
  readonly queuedCount: number;
  readonly reusedCount: number;
  readonly skippedCount: number;
  readonly delegatedCount: number;
  readonly ineligibleCount: number;
  readonly notReplayableCount: number;
  readonly staleCount: number;
  readonly enqueueFailedCount: number;
};

export type CampaignAdminNotificationTriggerBulkExecutionResponse = {
  readonly triggerId: string;
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly templateId: string;
  readonly result: CampaignAdminNotificationTriggerBulkExecutionResult;
};

export type CampaignAdminNotificationTemplateDescriptor = {
  readonly templateId: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly requiredFields: readonly CampaignAdminNotificationFieldDescriptor[];
};

export type CampaignAdminNotificationTemplatePreview = {
  readonly templateId: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly requiredFields: readonly CampaignAdminNotificationFieldDescriptor[];
  readonly exampleSubject: string;
  readonly html: string;
  readonly text: string;
};

export type CampaignAdminStagedReviewDraft = {
  readonly userId: string;
  readonly recordKey: string;
  readonly status: CampaignAdminReviewDecision;
  readonly feedbackText: string;
  readonly approvalRiskAcknowledged?: boolean;
  readonly sendNotification?: boolean;
};

export type CampaignAdminQueueSearch = {
  readonly phase?: CampaignAdminPhase;
  readonly reviewStatus?: CampaignAdminReviewStatus;
  readonly reviewStatusMode?: "all";
  readonly interactionId?: string;
  readonly lessonId?: string;
  readonly entityCui?: string;
  readonly scopeType?: CampaignAdminScopeType;
  readonly payloadKind?: CampaignAdminPayloadKind;
  readonly submissionPath?: CampaignAdminSubmissionPath;
  readonly userId?: string;
  readonly recordKey?: string;
  readonly recordKeyPrefix?: string;
  readonly submittedAtFrom?: string;
  readonly submittedAtTo?: string;
  readonly updatedAtFrom?: string;
  readonly updatedAtTo?: string;
  readonly hasInstitutionThread?: boolean;
  readonly threadPhase?: CampaignAdminThreadPhase;
  readonly sortBy?: CampaignAdminUserInteractionsSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly reviewSelectionKey?: string;
  readonly cursor?: string;
  readonly pageIndex?: number;
  readonly limit: number;
};

export type CampaignAdminQueueFilters = Omit<
  CampaignAdminQueueSearch,
  "limit" | "reviewSelectionKey" | "reviewStatusMode" | "cursor" | "pageIndex"
>;

export type CampaignAdminUserPageSearch = Omit<
  CampaignAdminQueueSearch,
  "phase" | "reviewStatusMode" | "userId" | "cursor" | "pageIndex" | "limit"
>;

export type CampaignAdminUsersSearch = {
  readonly query?: string;
  readonly entityCui?: string;
  readonly sortBy?: CampaignAdminUsersSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly cursor?: string;
  readonly pageIndex?: number;
  readonly limit: number;
};

export type CampaignAdminEntitiesSearch = {
  readonly query?: string;
  readonly interactionId?: string;
  readonly hasPendingReviews?: boolean;
  readonly hasSubscribers?: boolean;
  readonly hasNotificationActivity?: boolean;
  readonly hasFailedNotifications?: boolean;
  readonly latestNotificationType?: CampaignAdminEntityNotificationType;
  readonly latestNotificationStatus?: CampaignAdminNotificationStatus;
  readonly sortBy?: CampaignAdminEntitiesSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly cursor?: string;
  readonly pageIndex?: number;
  readonly limit: number;
};

export type CampaignAdminEntitiesFilters = Omit<
  CampaignAdminEntitiesSearch,
  "cursor" | "pageIndex" | "limit"
>;

export type CampaignAdminNotificationsSearch = {
  readonly tab?: CampaignAdminNotificationsTab;
  readonly notificationType?: string;
  readonly templateId?: string;
  readonly userId?: string;
  readonly status?: CampaignAdminNotificationStatus;
  readonly eventType?: CampaignAdminNotificationEventType;
  readonly entityCui?: string;
  readonly threadId?: string;
  readonly source?: CampaignAdminNotificationSource;
  readonly sortBy?: CampaignAdminNotificationSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly triggerId?: string;
  readonly triggerMode?: CampaignAdminNotificationTriggerMode;
  readonly triggerDryRun?: boolean;
  readonly triggerLimit?: number;
  readonly triggerUserId?: string;
  readonly triggerRecordKey?: string;
  readonly triggerEntityCui?: string;
  readonly triggerInteractionId?: string;
  readonly triggerInteractionIds?: string;
  readonly triggerReviewStatus?: Exclude<CampaignAdminReviewStatus, "pending">;
  readonly triggerUpdatedAtFrom?: string;
  readonly triggerUpdatedAtTo?: string;
  readonly triggerSubmittedAtFrom?: string;
  readonly triggerSubmittedAtTo?: string;
  readonly cursor?: string;
  readonly pageIndex?: number;
  readonly limit: number;
};

export type CampaignAdminNotificationsAuditFilters = Omit<
  CampaignAdminNotificationsSearch,
  | "tab"
  | "triggerId"
  | "triggerMode"
  | "triggerDryRun"
  | "triggerLimit"
  | "triggerUserId"
  | "triggerRecordKey"
  | "triggerEntityCui"
  | "triggerInteractionId"
  | "triggerInteractionIds"
  | "triggerReviewStatus"
  | "triggerUpdatedAtFrom"
  | "triggerUpdatedAtTo"
  | "triggerSubmittedAtFrom"
  | "triggerSubmittedAtTo"
  | "cursor"
  | "pageIndex"
  | "limit"
>;

export type CampaignAdminFilterDraft = {
  readonly phase: CampaignAdminPhase | "";
  readonly reviewStatus: CampaignAdminReviewStatus | "";
  readonly interactionId: string;
  readonly lessonId: string;
  readonly entityCui: string;
  readonly scopeType: CampaignAdminScopeType | "";
  readonly payloadKind: CampaignAdminPayloadKind | "";
  readonly userId: string;
  readonly recordKey: string;
  readonly recordKeyPrefix: string;
  readonly submittedAtFrom: string;
  readonly submittedAtTo: string;
  readonly updatedAtFrom: string;
  readonly updatedAtTo: string;
  readonly hasInstitutionThread: "" | "true" | "false";
  readonly threadPhase: CampaignAdminThreadPhase | "";
  readonly limit: number;
};
